package com.portfolio.ledger.controller;

import com.portfolio.ledger.dto.PostTransactionRequest;
import com.portfolio.ledger.dto.TransactionResponse;
import com.portfolio.ledger.entity.LedgerEntry;
import com.portfolio.ledger.entity.LedgerTransaction;
import com.portfolio.ledger.service.BalanceCacheService;
import com.portfolio.ledger.service.LedgerPostingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerPostingService postingService;
    private final BalanceCacheService balanceCacheService;

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
