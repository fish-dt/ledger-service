package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.LedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {

    // Backs the idempotency check: if a transaction with this key already
    // exists, the caller is retrying and we return the original result
    // instead of posting the money twice.
    Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);
}
