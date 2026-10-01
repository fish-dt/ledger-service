package com.portfolio.ledger.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        String idempotencyKey,
        String description,
        Instant createdAt,
        List<EntryLine> entries,
        boolean deduped // true if this call returned an existing txn instead of creating one
) {
    public record EntryLine(Long accountId, Long amountCents) {}
}
