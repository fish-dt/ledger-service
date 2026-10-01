-- ============================================================================
-- Core double-entry ledger schema.
--
-- Design goal: it must be structurally impossible to commit an unbalanced
-- transaction, even if application code has a bug. We enforce this with a
-- DEFERRABLE CONSTRAINT TRIGGER that runs at COMMIT time and checks that every
-- ledger_transaction's entries sum to zero. Deferring to commit-time (rather
-- than statement-time) is required because entries are inserted one row at a
-- time inside the same transaction -- checking after each individual INSERT
-- would reject every transaction as "unbalanced" until the last row lands.
-- ============================================================================

CREATE TABLE accounts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN
        ('PROCESSOR_CLEARING', 'MERCHANT_PAYABLE', 'PLATFORM_REVENUE', 'PLATFORM_FEE')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- caller-supplied key; makes retried "post this payment" calls a no-op
    -- instead of double-posting money. This is the idempotency mechanism.
    idempotency_key  TEXT NOT NULL UNIQUE,
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id  UUID NOT NULL REFERENCES ledger_transactions(id),
    account_id      BIGINT NOT NULL REFERENCES accounts(id),
    -- convention: positive = debit, negative = credit. Stored in minor units
    -- (cents) as BIGINT -- never FLOAT/DOUBLE for money.
    amount_cents    BIGINT NOT NULL CHECK (amount_cents <> 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for the query every balance lookup and statement view runs:
-- "give me this account's entries in time order". Benchmarked in
-- docs/benchmarks.md with EXPLAIN ANALYZE before/after.
CREATE INDEX idx_entries_account_created ON ledger_entries (account_id, created_at);
CREATE INDEX idx_entries_transaction ON ledger_entries (transaction_id);

-- ----------------------------------------------------------------------------
-- The invariant-enforcing trigger.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_transaction_balances()
RETURNS TRIGGER AS $$
DECLARE
    v_sum BIGINT;
    v_txn_id UUID;
BEGIN
    v_txn_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

    SELECT COALESCE(SUM(amount_cents), 0) INTO v_sum
    FROM ledger_entries
    WHERE transaction_id = v_txn_id;

    IF v_sum <> 0 THEN
        RAISE EXCEPTION
            'Ledger transaction % is unbalanced: entries sum to % (must be 0)',
            v_txn_id, v_sum
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_transaction_balances
    AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION check_transaction_balances();

-- ----------------------------------------------------------------------------
-- Outbox: written in the SAME transaction as the ledger entries, so the
-- ledger and the "notify downstream" intent can never disagree. A separate
-- relay process polls WHERE published = false and publishes to Redis pub/sub.
-- ----------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id  UUID NOT NULL REFERENCES ledger_transactions(id),
    event_type      TEXT NOT NULL DEFAULT 'LEDGER_TRANSACTION_POSTED',
    payload         JSONB NOT NULL,
    published       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at) WHERE published = false;

-- ----------------------------------------------------------------------------
-- Reconciliation: uploaded processor payout batches, queued for async
-- processing via SELECT ... FOR UPDATE SKIP LOCKED (Postgres-as-queue).
-- ----------------------------------------------------------------------------
CREATE TABLE reconciliation_jobs (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_file  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ
);

CREATE TABLE mismatch_flags (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reconciliation_job_id BIGINT NOT NULL REFERENCES reconciliation_jobs(id),
    processor_ref      TEXT NOT NULL,
    mismatch_type      TEXT NOT NULL
        CHECK (mismatch_type IN ('AMOUNT_MISMATCH', 'MISSING_INTERNAL', 'MISSING_PROCESSOR', 'DUPLICATE')),
    processor_amount_cents BIGINT,
    internal_amount_cents  BIGINT,
    details            JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved           BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_mismatch_job ON mismatch_flags (reconciliation_job_id);

-- Seed a few accounts so the app is usable immediately after startup.
INSERT INTO accounts (name, account_type) VALUES
    ('Processor Clearing', 'PROCESSOR_CLEARING'),
    ('Merchant Payable',   'MERCHANT_PAYABLE'),
    ('Platform Revenue',   'PLATFORM_REVENUE'),
    ('Platform Fee',       'PLATFORM_FEE');
