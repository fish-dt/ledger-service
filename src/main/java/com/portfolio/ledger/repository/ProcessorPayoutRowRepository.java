package com.portfolio.ledger.repository;

import com.portfolio.ledger.entity.ProcessorPayoutRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProcessorPayoutRowRepository extends JpaRepository<ProcessorPayoutRow, Long> {

    List<ProcessorPayoutRow> findByReconciliationJobIdOrderByRowNumberAsc(Long reconciliationJobId);

    long countByReconciliationJobId(Long reconciliationJobId);
}
