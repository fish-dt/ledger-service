package com.portfolio.ledger.service;

import com.portfolio.ledger.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Caches each account's running balance in Redis so the hot-path "get balance"
 * read doesn't hit Postgres every time.
 *
 * Invalidation strategy: write-through invalidation, not TTL-based expiry.
 * Every new ledger entry for an account calls invalidate(accountId) in the
 * same application flow that committed the entry, so the cache is never
 * stale for longer than one request. A short TTL (5 min) is kept only as a
 * safety net against a missed invalidation, not as the primary mechanism --
 * that's the trade-off worth stating out loud: correctness relies on every
 * write path remembering to invalidate, which is why invalidate() is called
 * from inside LedgerPostingService.postTransaction(), not left to callers.
 */
@Service
@RequiredArgsConstructor
public class BalanceCacheService {

    private static final Duration SAFETY_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "balance:account:";

    private final StringRedisTemplate redisTemplate;
    private final LedgerEntryRepository ledgerEntryRepository;

    public long getBalance(Long accountId) {
        String key = KEY_PREFIX + accountId;
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return Long.parseLong(cached);
        }

        long balance = ledgerEntryRepository.sumAmountByAccountId(accountId);
        redisTemplate.opsForValue().set(key, Long.toString(balance), SAFETY_TTL);
        return balance;
    }

    public void invalidate(Long accountId) {
        redisTemplate.delete(KEY_PREFIX + accountId);
    }
}
