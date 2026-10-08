package com.portfolio.ledger.controller;

import com.portfolio.ledger.dto.OutboxEventResponse;
import com.portfolio.ledger.repository.OutboxEventRepository;
import com.portfolio.ledger.service.SseBroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventsController {

    private final SseBroadcastService sseBroadcastService;
    private final OutboxEventRepository outboxEventRepository;

    // Browser connects with `new EventSource('/api/events/stream')`. Each
    // message arrives as a named event -- "outbox" or "mismatch" -- see
    // SseBroadcastService for how the Redis channel maps to the event name.
    @GetMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter stream() {
        return sseBroadcastService.subscribeClient();
    }

    // Fallback for clients that poll instead of using SSE, and what backs
    // the outbox visualizer's initial render before any live event arrives.
    @GetMapping("/outbox")
    public ResponseEntity<List<OutboxEventResponse>> recentOutboxEvents() {
        List<OutboxEventResponse> events = outboxEventRepository.findTop50ByOrderByCreatedAtDesc()
                .stream()
                .map(OutboxEventResponse::from)
                .toList();
        return ResponseEntity.ok(events);
    }
}
