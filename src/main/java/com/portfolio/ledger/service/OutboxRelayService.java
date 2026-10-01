package com.portfolio.ledger.service;

import com.portfolio.ledger.entity.OutboxEvent;
import com.portfolio.ledger.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Polls outbox_events for unpublished rows using SELECT ... FOR UPDATE SKIP
 * LOCKED, publishes each to a Redis pub/sub channel for the live mismatch
 * dashboard, then marks it published -- all in one transaction. If this
 * process dies between publish and commit, the row stays unpublished and
 * gets retried (at-least-once delivery; the dashboard is idempotent on
 * transactionId so a duplicate delivery is harmless).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxRelayService {

    private static final String CHANNEL = "ledger:transactions";

    private final OutboxEventRepository outboxEventRepository;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedDelayString = "${ledger.outbox.poll-interval-ms:1000}")
    @Transactional
    public void relay() {
        List<OutboxEvent> batch = outboxEventRepository.lockNextUnpublished(50);
        for (OutboxEvent event : batch) {
            try {
                redisTemplate.convertAndSend(CHANNEL, event.getPayload());
                event.setPublished(true);
                event.setPublishedAt(Instant.now());
            } catch (Exception e) {
                log.warn("Failed to publish outbox event {}, will retry next poll", event.getId(), e);
            }
        }
    }
}
