package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.ReconciliationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReconciliationJobRepository extends JpaRepository<ReconciliationJob, Long> {

    // Postgres-as-queue: FOR UPDATE SKIP LOCKED lets multiple worker instances
    // poll concurrently without blocking on each other or double-claiming a
    // row. Deliberately no @Lock annotation here -- the native query already
    // performs the row lock, and stacking Spring Data's @Lock on top of a
    // native FOR UPDATE query conflicts with Hibernate's own lock handling.
    @Query(value = "SELECT * FROM reconciliation_jobs WHERE status = 'PENDING' " +
            "ORDER BY created_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<ReconciliationJob> claimNextPending(@Param("limit") int limit);
}
