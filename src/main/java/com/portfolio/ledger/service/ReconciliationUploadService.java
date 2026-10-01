package com.portfolio.ledger.service;

import com.portfolio.ledger.entity.ProcessorPayoutRow;
import com.portfolio.ledger.entity.ReconciliationJob;
import com.portfolio.ledger.repository.ProcessorPayoutRowRepository;
import com.portfolio.ledger.repository.ReconciliationJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses an uploaded CSV (header: processor_ref,amount_cents) into
 * processor_payout_rows and creates a PENDING reconciliation_jobs row.
 * Parsing happens synchronously on upload -- deliberately cheap and
 * fast -- while the actual comparison against the ledger runs async in
 * ReconciliationWorkerService, so a slow/large reconciliation run never
 * blocks the HTTP request that uploaded the file.
 */
@Service
@RequiredArgsConstructor
public class ReconciliationUploadService {

    private final ReconciliationJobRepository jobRepository;
    private final ProcessorPayoutRowRepository rowRepository;

    @Transactional
    public ReconciliationJob upload(MultipartFile file) {
        ReconciliationJob job = new ReconciliationJob();
        job.setSourceFile(file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.csv");
        job.setStatus(ReconciliationJob.Status.PENDING);
        job.setCreatedAt(Instant.now());
        job = jobRepository.save(job);

        List<ProcessorPayoutRow> rows = parse(file, job.getId());
        rowRepository.saveAll(rows);

        return job;
    }

    private List<ProcessorPayoutRow> parse(MultipartFile file, Long jobId) {
        List<ProcessorPayoutRow> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String line;
            int rowNumber = 0;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                if (first) {
                    first = false;
                    // tolerate an optional header line
                    if (line.toLowerCase().startsWith("processor_ref")) continue;
                }
                String[] parts = line.split(",", 2);
                if (parts.length != 2) {
                    throw new IllegalArgumentException(
                            "Malformed CSV row " + rowNumber + ": expected 'processor_ref,amount_cents'");
                }
                ProcessorPayoutRow row = new ProcessorPayoutRow();
                row.setReconciliationJobId(jobId);
                row.setProcessorRef(parts[0].trim());
                row.setAmountCents(Long.parseLong(parts[1].trim()));
                row.setRowNumber(rowNumber++);
                row.setCreatedAt(Instant.now());
                rows.add(row);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded CSV", e);
        }
        return rows;
    }
}
