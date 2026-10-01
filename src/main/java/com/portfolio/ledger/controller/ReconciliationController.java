package com.portfolio.ledger.controller;

import com.portfolio.ledger.dto.ReconciliationJobResponse;
import com.portfolio.ledger.entity.ReconciliationJob;
import com.portfolio.ledger.repository.MismatchFlagRepository;
import com.portfolio.ledger.repository.ProcessorPayoutRowRepository;
import com.portfolio.ledger.repository.ReconciliationJobRepository;
import com.portfolio.ledger.service.ReconciliationUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationUploadService uploadService;
    private final ReconciliationJobRepository jobRepository;
    private final ProcessorPayoutRowRepository payoutRowRepository;
    private final MismatchFlagRepository mismatchFlagRepository;

    @PostMapping(value = "/jobs", consumes = "multipart/form-data")
    public ResponseEntity<ReconciliationJobResponse> upload(@RequestParam("file") MultipartFile file) {
        ReconciliationJob job = uploadService.upload(file);
        long rowCount = payoutRowRepository.countByReconciliationJobId(job.getId());
        // Freshly uploaded -> PENDING, no mismatches computed yet. Poll
        // GET /jobs/{id} (or GET /jobs) until status is DONE.
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ReconciliationJobResponse.from(job, rowCount, List.of()));
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ReconciliationJobResponse> getJob(@PathVariable Long id) {
        ReconciliationJob job = jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation job " + id + " not found"));
        long rowCount = payoutRowRepository.countByReconciliationJobId(id);
        var mismatches = mismatchFlagRepository.findByReconciliationJobIdOrderByCreatedAtAsc(id);
        return ResponseEntity.ok(ReconciliationJobResponse.from(job, rowCount, mismatches));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<ReconciliationJobResponse>> listJobs() {
        List<ReconciliationJobResponse> jobs = jobRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(job -> ReconciliationJobResponse.from(
                        job,
                        payoutRowRepository.countByReconciliationJobId(job.getId()),
                        mismatchFlagRepository.findByReconciliationJobIdOrderByCreatedAtAsc(job.getId())))
                .toList();
        return ResponseEntity.ok(jobs);
    }
}
