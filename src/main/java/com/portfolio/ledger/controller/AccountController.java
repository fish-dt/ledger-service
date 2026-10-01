package com.portfolio.ledger.controller;

import com.portfolio.ledger.entity.Account;
import com.portfolio.ledger.repository.AccountRepository;
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
}
