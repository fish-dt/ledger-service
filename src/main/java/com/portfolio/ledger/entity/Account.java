package com.portfolio.ledger.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "account_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private AccountType accountType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum AccountType {
        PROCESSOR_CLEARING, MERCHANT_PAYABLE, PLATFORM_REVENUE, PLATFORM_FEE
    }
}
