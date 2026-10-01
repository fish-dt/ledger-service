package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.MismatchFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MismatchFlagRepository extends JpaRepository<MismatchFlag, Long> {

    List<MismatchFlag> findByReconciliationJobIdOrderByCreatedAtAsc(Long reconciliationJobId);
}
