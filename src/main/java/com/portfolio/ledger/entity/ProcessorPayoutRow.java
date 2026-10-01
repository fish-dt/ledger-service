package com.portfolio.ledger.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "processor_payout_rows")
@Getter
@Setter
@NoArgsConstructor
public class ProcessorPayoutRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reconciliation_job_id", nullable = false)
    private Long reconciliationJobId;

    @Column(name = "processor_ref", nullable = false)
    private String processorRef;

    @Column(name = "amount_cents", nullable = false)
    private Long amountCents;

    @Column(name = "row_number", nullable = false)
    private Integer rowNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
