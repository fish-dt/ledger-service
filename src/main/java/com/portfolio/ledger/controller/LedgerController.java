package com.portfolio.ledger.controller;

import com.portfolio.ledger.dto.PostTransactionRequest;
import com.portfolio.ledger.dto.TransactionResponse;
import com.portfolio.ledger.entity.LedgerTransaction;
import com.portfolio.ledger.exception.ResourceNotFoundException;
import com.portfolio.ledger.repository.LedgerTransactionRepository;
import com.portfolio.ledger.service.BalanceCacheService;
import com.portfolio.ledger.service.LedgerPostingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerPostingService postingService;
    private final BalanceCacheService balanceCacheService;
    private final LedgerTransactionRepository transactionRepository;

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> postTransaction(
            @Valid @RequestBody PostTransactionRequest request) {

        LedgerPostingService.PostResult result = postingService.postTransaction(request);
        TransactionResponse response = toResponse(result.transaction(), result.deduped());

        // A deduped replay still returns 200 (it succeeded, just not newly);
        // a genuinely new post returns 201.
        HttpStatus status = result.deduped() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(response);
    }

    // Powers /transactions/[id] on the dashboard -- the "view what you just
    // posted" page that shows the debit/credit breakdown and the sum-to-zero
    // proof. Uses findByIdWithEntries (JOIN FETCH), not plain findById --
    // open-in-view is disabled, so a lazy-loaded entries collection would
    // throw once the Hibernate session closed after the repository call.
    @GetMapping("/transactions/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable UUID id) {
        LedgerTransaction txn = transactionRepository.findByIdWithEntries(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction " + id + " not found"));
        return ResponseEntity.ok(toResponse(txn, false));
    }

    @GetMapping("/accounts/{accountId}/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@PathVariable Long accountId) {
        long balanceCents = balanceCacheService.getBalance(accountId);
        return ResponseEntity.ok(Map.of(
                "accountId", accountId,
                "balanceCents", balanceCents
        ));
    }

    private TransactionResponse toResponse(LedgerTransaction txn, boolean deduped) {
        List<TransactionResponse.EntryLine> lines = txn.getEntries().stream()
                .map(e -> new TransactionResponse.EntryLine(e.getAccount().getId(), e.getAmountCents()))
                .toList();
        return new TransactionResponse(
                txn.getId(), txn.getIdempotencyKey(), txn.getDescription(),
                txn.getCreatedAt(), lines, deduped
        );
    }
}
