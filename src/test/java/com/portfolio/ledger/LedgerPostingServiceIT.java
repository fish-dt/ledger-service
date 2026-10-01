package com.portfolio.ledger;

import com.portfolio.ledger.dto.PostTransactionRequest;
import com.portfolio.ledger.exception.UnbalancedTransactionException;
import com.portfolio.ledger.service.LedgerPostingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves the two properties the whole design rests on:
 *  1. A transaction whose entries don't sum to zero is rejected.
 *  2. Replaying the same idempotency key does not double-post.
 *
 * Redis auto-configuration is left pointed at localhost; these tests only
 * exercise the Postgres-backed posting path, not the cache/outbox relay.
 */
@SpringBootTest
@Testcontainers
class LedgerPostingServiceIT {

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

    @Autowired
    private LedgerPostingService postingService;

    @Test
    void rejectsUnbalancedTransaction() {
        var request = new PostTransactionRequest(
                UUID.randomUUID().toString(),
                "intentionally unbalanced",
                List.of(
                        new PostTransactionRequest.EntryLine(1L, 1000L),
                        new PostTransactionRequest.EntryLine(2L, -500L) // doesn't net to zero
                )
        );

        assertThatThrownBy(() -> postingService.postTransaction(request))
                .isInstanceOf(UnbalancedTransactionException.class);
    }

    @Test
    void dedupesRetriedIdempotencyKey() {
        String key = UUID.randomUUID().toString();
        var request = new PostTransactionRequest(
                key,
                "payout batch 42",
                List.of(
                        new PostTransactionRequest.EntryLine(1L, 1000L),
                        new PostTransactionRequest.EntryLine(2L, -1000L)
                )
        );

        var first = postingService.postTransaction(request);
        var retry = postingService.postTransaction(request); // simulates a retried webhook

        assertThat(first.deduped()).isFalse();
        assertThat(retry.deduped()).isTrue();
        assertThat(retry.transaction().getId()).isEqualTo(first.transaction().getId());
    }
}
