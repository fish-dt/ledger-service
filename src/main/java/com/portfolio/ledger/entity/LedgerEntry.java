package com.portfolio.ledger.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
@NoArgsConstructor
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private LedgerTransaction transaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    // Positive = debit, negative = credit. Minor units (cents). Never a
    // float/double: BIGINT round-trips exactly, floating point does not.
    @Column(name = "amount_cents", nullable = false)
    private Long amountCents;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static LedgerEntry of(Account account, long amountCents) {
        LedgerEntry e = new LedgerEntry();
        e.setAccount(account);
        e.setAmountCents(amountCents);
        return e;
    }
}
