package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    // Uses idx_entries_account_created (account_id, created_at). This is the
    // query benchmarked with EXPLAIN ANALYZE in docs/benchmarks.md.
    @Query("SELECT COALESCE(SUM(e.amountCents), 0) FROM LedgerEntry e WHERE e.account.id = :accountId")
    long sumAmountByAccountId(@Param("accountId") Long accountId);

    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    List<LedgerEntry> findByAccountIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long accountId, Instant from, Instant to);

    // Backs MISSING_PROCESSOR detection: internal transactions we posted
    // against the Processor Clearing account that the uploaded processor
    // file doesn't mention at all. JOIN FETCH avoids an N+1 when the worker
    // reads transaction.idempotencyKey for every entry in the window.
    @Query("SELECT e FROM LedgerEntry e JOIN FETCH e.transaction JOIN FETCH e.account a " +
            "WHERE a.accountType = com.portfolio.ledger.entity.Account.AccountType.PROCESSOR_CLEARING " +
            "AND e.createdAt BETWEEN :from AND :to")
    List<LedgerEntry> findProcessorClearingEntriesBetween(@Param("from") Instant from, @Param("to") Instant to);

    // Powers GET /api/accounts/{id}/entries. Selecting e.transaction.id (not
    // e.transaction) reads the FK column directly rather than loading the
    // whole association, so this stays a single query with no lazy-loading
    // trap -- unlike a plain findByAccountId() followed by touching
    // entry.getTransaction() after the session closes.
    @Query("SELECT e.id as id, e.amountCents as amountCents, e.createdAt as createdAt, " +
            "e.transaction.id as transactionId FROM LedgerEntry e " +
            "WHERE e.account.id = :accountId ORDER BY e.createdAt DESC")
    List<EntryWithTransactionId> findEntriesWithTransactionByAccountId(@Param("accountId") Long accountId);

    interface EntryWithTransactionId {
        Long getId();
        Long getAmountCents();
        Instant getCreatedAt();
        UUID getTransactionId();
    }
}
