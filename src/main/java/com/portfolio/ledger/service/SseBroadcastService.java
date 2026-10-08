package com.portfolio.ledger.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Bridges the two Redis pub/sub channels this service already publishes to
 * (ledger:transactions from OutboxRelayService, ledger:mismatches from
 * ReconciliationWorkerService) out to connected browsers via Server-Sent
 * Events. One Redis subscription, fanned out to every connected SseEmitter
 * -- not one Redis subscription per browser tab.
 *
 * Known limitation, worth stating plainly: each open SSE connection holds a
 * servlet thread for its lifetime (this is spring-boot-starter-web, not
 * WebFlux). Fine at demo/portfolio scale; a real production version of this
 * would move to WebFlux or cap concurrent connections.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SseBroadcastService {

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes

    private final RedisMessageListenerContainer listenerContainer;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void subscribe() {
        MessageListener listener = (Message message, byte[] pattern) -> {
            String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
            String body = new String(message.getBody(), StandardCharsets.UTF_8);
            String eventName = channel.equals("ledger:mismatches") ? "mismatch" : "outbox";
            broadcast(eventName, body);
        };
        listenerContainer.addMessageListener(listener, new ChannelTopic("ledger:transactions"));
        listenerContainer.addMessageListener(listener, new ChannelTopic("ledger:mismatches"));
    }

    public SseEmitter subscribeClient() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));
        return emitter;
    }

    private void broadcast(String eventName, String data) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                log.debug("Dropping SSE client, send failed", e);
                emitters.remove(emitter);
            }
        }
    }
}
