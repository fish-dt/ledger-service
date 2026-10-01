package com.portfolio.ledger.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "mismatch_flags")
@Getter
@Setter
@NoArgsConstructor
public class MismatchFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reconciliation_job_id", nullable = false)
    private Long reconciliationJobId;

    @Column(name = "processor_ref", nullable = false)
    private String processorRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "mismatch_type", nullable = false)
    private MismatchType mismatchType;

    @Column(name = "processor_amount_cents")
    private Long processorAmountCents;

    @Column(name = "internal_amount_cents")
    private Long internalAmountCents;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean resolved = false;

    public enum MismatchType {
        AMOUNT_MISMATCH,   // both sides have it, amounts disagree
        MISSING_INTERNAL,  // processor says it happened, we have no record
        MISSING_PROCESSOR, // we recorded it, processor's file doesn't have it
        DUPLICATE          // same processor_ref appears more than once in the file
    }
}
