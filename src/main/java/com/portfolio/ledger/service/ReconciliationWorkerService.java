package com.portfolio.ledger.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.ledger.entity.*;
import com.portfolio.ledger.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Async reconciliation worker.
 *
 * Claims PENDING jobs with SELECT ... FOR UPDATE SKIP LOCKED (same
 * Postgres-as-queue trick as the outbox relay), then for each job compares
 * the uploaded processor_payout_rows against our own ledger and flags four
 * kinds of disagreement:
 *
 *   AMOUNT_MISMATCH   - both sides have the reference, amounts disagree
 *   MISSING_INTERNAL  - processor's file has it, we never posted it
 *   MISSING_PROCESSOR - we posted it, processor's file doesn't mention it
 *   DUPLICATE         - the same processor_ref appears more than once in the file
 *
 * Matching key: we deliberately reuse ledger_transactions.idempotency_key as
 * the join key against the processor's own reference for that payout. This
 * avoids a separate mapping table -- in practice the processor's event/
 * transfer ID IS what you'd pass as the idempotency key when you originally
 * posted the transaction from their webhook, so the join is "free."
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationWorkerService {

    private static final String MISMATCH_CHANNEL = "ledger:mismatches";
    private static final Duration LOOKBACK_WINDOW = Duration.ofDays(1);

    private final ReconciliationJobRepository jobRepository;
    private final ProcessorPayoutRowRepository payoutRowRepository;
    private final MismatchFlagRepository mismatchFlagRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ledger.reconciliation.batch-size:20}")
    private int batchSize;

    @Scheduled(fixedDelayString = "${ledger.reconciliation.poll-interval-ms:2000}")
    @Transactional
    public void processPendingJobs() {
        List<ReconciliationJob> jobs = jobRepository.claimNextPending(batchSize);
        for (ReconciliationJob job : jobs) {
            job.setStatus(ReconciliationJob.Status.PROCESSING);
            job.setStartedAt(Instant.now());
            try {
                reconcile(job);
                job.setStatus(ReconciliationJob.Status.DONE);
            } catch (Exception e) {
                log.error("Reconciliation job {} failed", job.getId(), e);
                job.setStatus(ReconciliationJob.Status.FAILED);
            } finally {
                job.setFinishedAt(Instant.now());
            }
        }
    }

    private void reconcile(ReconciliationJob job) {
        List<ProcessorPayoutRow> rows = payoutRowRepository.findByReconciliationJobIdOrderByRowNumberAsc(job.getId());
        Map<String, List<ProcessorPayoutRow>> byRef = rows.stream()
                .collect(Collectors.groupingBy(ProcessorPayoutRow::getProcessorRef));

        for (Map.Entry<String, List<ProcessorPayoutRow>> e : byRef.entrySet()) {
            String ref = e.getKey();
            List<ProcessorPayoutRow> group = e.getValue();

            if (group.size() > 1) {
                flag(job, ref, MismatchFlag.MismatchType.DUPLICATE,
                        group.get(0).getAmountCents(), null,
                        Map.of("occurrences", group.size()));
                continue; // ambiguous which row is "correct" -- surface for manual review
            }

            ProcessorPayoutRow row = group.get(0);
            Optional<LedgerTransaction> txn = transactionRepository.findByIdempotencyKey(ref);

            if (txn.isEmpty()) {
                flag(job, ref, MismatchFlag.MismatchType.MISSING_INTERNAL,
                        row.getAmountCents(), null, null);
                continue;
            }

            long internalAmount = txn.get().getEntries().stream()
                    .filter(entry -> entry.getAccount().getAccountType() == Account.AccountType.PROCESSOR_CLEARING)
                    .mapToLong(entry -> Math.abs(entry.getAmountCents()))
                    .findFirst()
                    .orElse(0L);

            if (internalAmount != row.getAmountCents()) {
                flag(job, ref, MismatchFlag.MismatchType.AMOUNT_MISMATCH,
                        row.getAmountCents(), internalAmount, null);
            }
        }

        // Reverse direction: internal Processor Clearing postings the file
        // never mentioned at all.
        Instant to = job.getCreatedAt();
        Instant from = to.minus(LOOKBACK_WINDOW);
        List<LedgerEntry> internalEntries = ledgerEntryRepository.findProcessorClearingEntriesBetween(from, to);

        for (LedgerEntry entry : internalEntries) {
            String ref = entry.getTransaction().getIdempotencyKey();
            if (!byRef.containsKey(ref)) {
                flag(job, ref, MismatchFlag.MismatchType.MISSING_PROCESSOR,
                        null, Math.abs(entry.getAmountCents()), null);
            }
        }
    }

    private void flag(ReconciliationJob job, String ref, MismatchFlag.MismatchType type,
                       Long processorAmount, Long internalAmount, Map<String, Object> extraDetails) {
        MismatchFlag flag = new MismatchFlag();
        flag.setReconciliationJobId(job.getId());
        flag.setProcessorRef(ref);
        flag.setMismatchType(type);
        flag.setProcessorAmountCents(processorAmount);
        flag.setInternalAmountCents(internalAmount);
        flag.setCreatedAt(Instant.now());
        try {
            flag.setDetails(objectMapper.writeValueAsString(extraDetails == null ? Map.of() : extraDetails));
        } catch (Exception e) {
            flag.setDetails("{}");
        }
        mismatchFlagRepository.save(flag);
        publishLive(job, flag);
    }

    private void publishLive(ReconciliationJob job, MismatchFlag flag) {
        try {
            Map<String, Object> event = Map.of(
                    "jobId", job.getId(),
                    "processorRef", flag.getProcessorRef(),
                    "mismatchType", flag.getMismatchType().name(),
                    "processorAmountCents", flag.getProcessorAmountCents(),
                    "internalAmountCents", flag.getInternalAmountCents()
            );
            redisTemplate.convertAndSend(MISMATCH_CHANNEL, objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            // Live dashboard push is best-effort; the row is already
            // durably saved in mismatch_flags regardless of pub/sub success.
            log.warn("Failed to publish live mismatch event for job {}", job.getId(), e);
        }
    }
}
