package com.portfolio.ledger.dto;

import com.portfolio.ledger.entity.OutboxEvent;

import java.time.Instant;
import java.util.UUID;

public record OutboxEventResponse(
        Long id,
        UUID transactionId,
        String eventType,
        boolean published,
        Instant createdAt,
        Instant publishedAt
) {
    public static OutboxEventResponse from(OutboxEvent e) {
        return new OutboxEventResponse(
                e.getId(), e.getTransactionId(), e.getEventType(),
                e.isPublished(), e.getCreatedAt(), e.getPublishedAt()
        );
    }
}
