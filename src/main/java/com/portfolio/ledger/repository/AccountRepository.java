package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
}
