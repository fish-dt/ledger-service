package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.LedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {

    // Backs the idempotency check: if a transaction with this key already
    // exists, the caller is retrying and we return the original result
    // instead of posting the money twice.
    Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);

    // Used by GET /api/transactions/{id}. JOIN FETCH is required, not
    // optional: spring.jpa.open-in-view is false in application.yml, so the
    // Hibernate session closes when this repository call returns. A plain
    // findById() would leave txn.getEntries() as an uninitialized lazy
    // proxy that throws LazyInitializationException the moment the
    // controller touches it after the repository method returns.
    @Query("SELECT t FROM LedgerTransaction t JOIN FETCH t.entries e JOIN FETCH e.account WHERE t.id = :id")
    Optional<LedgerTransaction> findByIdWithEntries(@Param("id") UUID id);
}
