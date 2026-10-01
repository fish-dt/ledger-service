-- Staging table for an uploaded processor payout CSV. Each row is one line
-- of the CSV, parsed and persisted before the async worker ever touches it,
-- so re-running reconciliation for a job doesn't require re-uploading.
CREATE TABLE processor_payout_rows (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reconciliation_job_id  BIGINT NOT NULL REFERENCES reconciliation_jobs(id),
    processor_ref          TEXT NOT NULL,
    amount_cents           BIGINT NOT NULL,
    row_number             INT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_rows_job ON processor_payout_rows (reconciliation_job_id);
CREATE INDEX idx_payout_rows_ref ON processor_payout_rows (processor_ref);
