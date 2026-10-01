package com.portfolio.ledger.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.ledger.dto.PostTransactionRequest;
import com.portfolio.ledger.entity.Account;
import com.portfolio.ledger.entity.LedgerEntry;
import com.portfolio.ledger.entity.LedgerTransaction;
import com.portfolio.ledger.entity.OutboxEvent;
import com.portfolio.ledger.exception.AccountNotFoundException;
import com.portfolio.ledger.exception.UnbalancedTransactionException;
import com.portfolio.ledger.repository.AccountRepository;
import com.portfolio.ledger.repository.LedgerTransactionRepository;
import com.portfolio.ledger.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The ONLY way money moves in this system. No other code path is allowed to
 * INSERT INTO ledger_entries directly -- that's what makes "unbalanced
 * transaction" structurally hard to write, backed up by the DB-level
 * constraint trigger in V1__core_ledger_schema.sql as a second line of
 * defense in case this invariant is ever bypassed.
 *
 * Idempotency: callers supply an idempotencyKey. If a transaction with that
 * key already exists, we return it unchanged instead of posting again --
 * this is what makes retried "charge succeeded" webhooks safe to replay.
 *
 * Outbox: the outbox row is written in the exact same @Transactional method,
 * so either both the ledger entries and the outbox event commit, or neither
 * do. A relay process (see OutboxRelayService) publishes it afterwards.
 */
@Service
@RequiredArgsConstructor
public class LedgerPostingService {

    private final AccountRepository accountRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final BalanceCacheService balanceCacheService;
    private final ObjectMapper objectMapper;

    @Transactional
    public PostResult postTransaction(PostTransactionRequest request) {
        Optional<LedgerTransaction> existing =
                transactionRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            return new PostResult(existing.get(), true);
        }

        long sum = request.entries().stream()
                .mapToLong(PostTransactionRequest.EntryLine::amountCents)
                .sum();
        if (sum != 0) {
            throw new UnbalancedTransactionException(sum);
        }

        LedgerTransaction txn = new LedgerTransaction();
        txn.setIdempotencyKey(request.idempotencyKey());
        txn.setDescription(request.description());
        txn.setCreatedAt(Instant.now());

        for (PostTransactionRequest.EntryLine line : request.entries()) {
            Account account = accountRepository.findById(line.accountId())
                    .orElseThrow(() -> new AccountNotFoundException(line.accountId()));
            LedgerEntry entry = LedgerEntry.of(account, line.amountCents());
            entry.setCreatedAt(txn.getCreatedAt());
            txn.addEntry(entry);
        }

        transactionRepository.save(txn);

        // Same transaction as the entries above -> outbox pattern.
        writeOutboxEvent(txn);

        // Invalidate every touched account's cached balance in the same
        // request flow that changed it (see BalanceCacheService javadoc).
        txn.getEntries().forEach(e -> balanceCacheService.invalidate(e.getAccount().getId()));

        return new PostResult(txn, false);
    }

    private void writeOutboxEvent(LedgerTransaction txn) {
        try {
            Map<String, Object> payload = Map.of(
                    "transactionId", txn.getId().toString(),
                    "idempotencyKey", txn.getIdempotencyKey(),
                    "entryCount", txn.getEntries().size(),
                    "postedAt", txn.getCreatedAt().toString()
            );
            OutboxEvent event = new OutboxEvent();
            event.setTransactionId(txn.getId());
            event.setPayload(objectMapper.writeValueAsString(payload));
            event.setCreatedAt(Instant.now());
            outboxEventRepository.save(event);
        } catch (Exception e) {
            // A JSON serialization failure here must fail the whole
            // transaction -- we'd rather roll back the ledger entries than
            // silently post money with no outbox notification.
            throw new IllegalStateException("Failed to write outbox event", e);
        }
    }

    public record PostResult(LedgerTransaction transaction, boolean deduped) {}
}
