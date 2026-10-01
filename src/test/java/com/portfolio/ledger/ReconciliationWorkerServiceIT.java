package com.portfolio.ledger;

import com.portfolio.ledger.dto.PostTransactionRequest;
import com.portfolio.ledger.entity.MismatchFlag;
import com.portfolio.ledger.entity.ProcessorPayoutRow;
import com.portfolio.ledger.entity.ReconciliationJob;
import com.portfolio.ledger.repository.MismatchFlagRepository;
import com.portfolio.ledger.repository.ProcessorPayoutRowRepository;
import com.portfolio.ledger.repository.ReconciliationJobRepository;
import com.portfolio.ledger.service.LedgerPostingService;
import com.portfolio.ledger.service.ReconciliationWorkerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Seeds three internal ledger transactions, then feeds the worker a CSV
 * staged with all four mismatch shapes at once, and asserts each is caught.
 * Redis is not started here -- ReconciliationWorkerService treats the live
 * pub/sub push as best-effort and swallows the connection failure, so this
 * test only proves the durable mismatch_flags rows are correct.
 */
@SpringBootTest
@Testcontainers
class ReconciliationWorkerServiceIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("ledger")
            .withUsername("ledger")
            .withPassword("ledger");

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private LedgerPostingService postingService;
    @Autowired private ReconciliationJobRepository jobRepository;
    @Autowired private ProcessorPayoutRowRepository rowRepository;
    @Autowired private MismatchFlagRepository mismatchFlagRepository;
    @Autowired private ReconciliationWorkerService worker;

    @Test
    void detectsAllFourMismatchTypes() {
        String refMatched = post(10_000L);   // will match exactly -> no flag
        String refWrongAmt = post(5_000L);   // CSV will claim a different amount
        String refMissingFromCsv = post(7_500L); // posted internally, CSV omits it -> MISSING_PROCESSOR
        String refNeverPosted = "po_" + UUID.randomUUID(); // in CSV only -> MISSING_INTERNAL
        String refDuplicated = refMatched; // reuse a real ref, but stage it twice in the CSV

        ReconciliationJob job = new ReconciliationJob();
        job.setSourceFile("test.csv");
        job.setStatus(ReconciliationJob.Status.PENDING);
        job.setCreatedAt(Instant.now());
        job = jobRepository.save(job);

        stageRow(job.getId(), refMatched, 10_000L, 0);
        stageRow(job.getId(), refWrongAmt, 4_999L, 1);      // off by 1 cent
        stageRow(job.getId(), refNeverPosted, 2_000L, 2);
        stageRow(job.getId(), refDuplicated, 10_000L, 3);   // duplicate of row 0
        // refMissingFromCsv intentionally has no row at all

        worker.processPendingJobs();

        List<MismatchFlag> flags = mismatchFlagRepository.findByReconciliationJobIdOrderByCreatedAtAsc(job.getId());
        Map<MismatchFlag.MismatchType, Long> byType = flags.stream()
                .collect(Collectors.groupingBy(MismatchFlag::getMismatchType, Collectors.counting()));

        assertThat(byType.get(MismatchFlag.MismatchType.AMOUNT_MISMATCH)).isEqualTo(1L);
        assertThat(byType.get(MismatchFlag.MismatchType.MISSING_INTERNAL)).isEqualTo(1L);
        assertThat(byType.get(MismatchFlag.MismatchType.MISSING_PROCESSOR)).isEqualTo(1L);
        assertThat(byType.get(MismatchFlag.MismatchType.DUPLICATE)).isEqualTo(1L);

        // The cleanly-matching ref must NOT appear under AMOUNT_MISMATCH --
        // it only shows up once, under DUPLICATE, since it was staged twice.
        assertThat(flags.stream()
                .filter(f -> f.getProcessorRef().equals(refMatched))
                .map(MismatchFlag::getMismatchType))
                .containsExactly(MismatchFlag.MismatchType.DUPLICATE);
    }

    private String post(long amountCents) {
        String ref = "po_" + UUID.randomUUID();
        var request = new PostTransactionRequest(
                ref, "seed",
                List.of(
                        new PostTransactionRequest.EntryLine(1L, -amountCents),
                        new PostTransactionRequest.EntryLine(2L, amountCents)
                )
        );
        postingService.postTransaction(request);
        return ref;
    }

    private void stageRow(Long jobId, String ref, long amountCents, int rowNumber) {
        ProcessorPayoutRow row = new ProcessorPayoutRow();
        row.setReconciliationJobId(jobId);
        row.setProcessorRef(ref);
        row.setAmountCents(amountCents);
        row.setRowNumber(rowNumber);
        row.setCreatedAt(Instant.now());
        rowRepository.save(row);
    }
}
