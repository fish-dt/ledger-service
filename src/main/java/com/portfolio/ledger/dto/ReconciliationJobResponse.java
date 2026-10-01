package com.portfolio.ledger.dto;

import com.portfolio.ledger.entity.MismatchFlag;
import com.portfolio.ledger.entity.ReconciliationJob;

import java.time.Instant;
import java.util.List;

public record ReconciliationJobResponse(
        Long id,
        String sourceFile,
        String status,
        Instant createdAt,
        Instant startedAt,
        Instant finishedAt,
        long rowCount,
        List<MismatchResponse> mismatches
) {
    public record MismatchResponse(
            Long id,
            String processorRef,
            String mismatchType,
            Long processorAmountCents,
            Long internalAmountCents,
            boolean resolved,
            Instant createdAt
    ) {
        public static MismatchResponse from(MismatchFlag f) {
            return new MismatchResponse(
                    f.getId(), f.getProcessorRef(), f.getMismatchType().name(),
                    f.getProcessorAmountCents(), f.getInternalAmountCents(),
                    f.isResolved(), f.getCreatedAt()
            );
        }
    }

    public static ReconciliationJobResponse from(ReconciliationJob job, long rowCount, List<MismatchFlag> mismatches) {
        return new ReconciliationJobResponse(
                job.getId(), job.getSourceFile(), job.getStatus().name(),
                job.getCreatedAt(), job.getStartedAt(), job.getFinishedAt(), rowCount,
                mismatches.stream().map(MismatchResponse::from).toList()
        );
    }
}
