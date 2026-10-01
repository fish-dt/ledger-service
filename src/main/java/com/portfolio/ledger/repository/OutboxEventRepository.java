package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    // SKIP LOCKED so multiple relay instances could run concurrently without
    // fighting over the same rows -- same trick as the reconciliation queue.
    // No @Lock annotation: the native FOR UPDATE SKIP LOCKED SQL already
    // performs the row lock, and stacking Spring Data's @Lock on top of a
    // native query conflicts with Hibernate's own lock handling.
    @Query(value = "SELECT * FROM outbox_events WHERE published = false " +
            "ORDER BY created_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<OutboxEvent> lockNextUnpublished(int limit);
}
