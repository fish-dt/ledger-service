package com.portfolio.ledger.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PostTransactionRequest(

        @NotBlank
        String idempotencyKey,

        String description,

        @NotEmpty
        @Size(min = 2, message = "a transaction needs at least two entry lines to balance")
        @Valid
        List<EntryLine> entries
) {
    public record EntryLine(
            Long accountId,
            // Positive = debit, negative = credit.
            Long amountCents
    ) {}
}
