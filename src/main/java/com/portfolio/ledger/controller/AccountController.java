package com.portfolio.ledger.controller;

import com.portfolio.ledger.exception.AccountNotFoundException;
import com.portfolio.ledger.repository.AccountRepository;
import com.portfolio.ledger.repository.LedgerEntryRepository;
import com.portfolio.ledger.service.BalanceCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountRepository accountRepository;
    private final BalanceCacheService balanceCacheService;
    private final LedgerEntryRepository ledgerEntryRepository;

    // Powers the dashboard's balance strip: every account with its current
    // (cached) balance in one call, instead of the frontend making N calls
    // to /api/accounts/{id}/balance.
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listAccounts() {
        List<Map<String, Object>> accounts = accountRepository.findAll().stream()
                .map(a -> Map.<String, Object>of(
                        "id", a.getId(),
                        "name", a.getName(),
                        "accountType", a.getAccountType().name(),
                        "balanceCents", balanceCacheService.getBalance(a.getId())
                ))
                .toList();
        return ResponseEntity.ok(accounts);
    }

    // Powers /accounts/[id] on the dashboard: entry history for the
    // balance-over-time chart, each entry linkable back to its transaction.
    @GetMapping("/{id}/entries")
    public ResponseEntity<List<Map<String, Object>>> getEntries(@PathVariable Long id) {
        if (accountRepository.findById(id).isEmpty()) {
            throw new AccountNotFoundException(id);
        }
        List<Map<String, Object>> entries = ledgerEntryRepository
                .findEntriesWithTransactionByAccountId(id).stream()
                .map(e -> Map.<String, Object>of(
                        "id", e.getId(),
                        "amountCents", e.getAmountCents(),
                        "createdAt", e.getCreatedAt(),
                        "transactionId", e.getTransactionId()
                ))
                .toList();
        return ResponseEntity.ok(entries);
    }
}
