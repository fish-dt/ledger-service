# Ledger — Payment Reconciliation Service

A backend that solves a real problem every payments company has: **your
internal records and your payment processor's records will eventually
disagree, and you need to know the moment they do.** This is the same class
of problem Stripe's internal ledger, and every fintech reconciliation job,
solves — money must never be double-counted or silently lost, even under
retries or partial failures.

It's a double-entry ledger (structurally impossible to post an unbalanced
transaction — enforced by the database itself, not just application code)
paired with an async worker that reconciles uploaded processor payout files
against that ledger and flags exactly where and how they disagree. There's a
real dashboard on top of it — not mockups, an actual Next.js app talking to
the live API.

## What it actually does, in one flow

1. You post payments into the ledger (money moving between accounts — the
   thing your app does every day).
2. Periodically, your payment processor (Stripe, Adyen, whoever) sends you a
   file of what *they* think happened.
3. This service compares the two and tells you, precisely: which payments
   don't match on amount, which ones you have that they don't, which ones
   they have that you don't, and which reference numbers appear twice by
   mistake.
4. You watch it happen on a dashboard, or find out via API.

## Architecture

```
┌──────────────────┐        REST (JSON)        ┌───────────────────────┐
│  Next.js dashboard │ ───────────────────────▶ │   Spring Boot API      │
│  (localhost:3000) │ ◀─────────────────────── │   (localhost:8080)     │
└──────────────────┘        polls every 5s      └───────────┬───────────┘
                                                              │
                                     ┌────────────────────────┼─────────────────────┐
                                     │                        │                     │
                              ┌──────▼──────┐         ┌───────▼──────┐     ┌────────▼───────┐
                              │  PostgreSQL  │         │    Redis      │     │  Reconciliation │
                              │  (ledger of  │         │ (balance      │     │  worker         │
                              │  record, DB- │         │  cache, pub/  │     │  (SKIP LOCKED   │
                              │  enforced    │         │  sub for live │     │  queue, polls   │
                              │  balance     │         │  mismatch     │     │  every 2s)      │
                              │  invariant)  │         │  events)      │     │                 │
                              └──────────────┘         └───────────────┘     └─────────────────┘
```

## Quickstart — run the whole thing end to end

This takes about 10 minutes and everything is free — no cloud account, no
API keys, no GPU.

**1. Start the backend** (Postgres + Redis + the API, via Docker):

```bash
docker compose up --build
```

Wait for `Started LedgerServiceApplication` in the logs. Flyway runs the
schema migrations automatically. Four accounts are seeded for you:
Processor Clearing, Merchant Payable, Platform Revenue, Platform Fee.

**2. Start the dashboard** (in a second terminal):

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open **http://localhost:3000**. You'll see four accounts at $0.00, an empty
activity chart, and "no reconciliation jobs yet" — that's correct, nothing's
happened yet.

**3. Generate some real activity.** This script posts real transactions
through the live API, then writes a CSV deliberately designed to disagree
with them in four specific ways:

```bash
python scripts/generate_payout_csv.py --count 10
```

It prints exactly what it injected — one amount off by a cent, one row it
left out, one row for a payment that doesn't exist internally, one
duplicated row. This is the test data; you'll be able to check the
dashboard's output against this script's printed expectations.

**4. Upload the file.** Either click **Upload payout file** on the
dashboard and pick `payout.csv`, or:

```bash
curl -X POST localhost:8080/api/reconciliation/jobs -F "file=@payout.csv"
```

**5. Watch it resolve.** The dashboard polls every 5 seconds. Within a few
seconds the job status flips from `Pending` → `Processing` → `Done`, the
balance strip updates, the activity chart fills in, and **Flagged for
review** shows exactly 4 items — matching what the script told you it
injected. That's the whole system working end to end, live.

## What each piece demonstrates

| Pattern | Where |
|---|---|
| **Idempotency** | `LedgerPostingService` — retried transactions with the same key never double-post. DB-enforced via a unique constraint. |
| **Outbox pattern** | Ledger entries and the outbox row commit in the same transaction, so the ledger and downstream notifications can never disagree. |
| **Queue / async worker** | `SELECT ... FOR UPDATE SKIP LOCKED` — used by both the outbox relay and the reconciliation job queue, so multiple worker instances could run without double-processing a row. |
| **DB-enforced invariant** | A `DEFERRABLE CONSTRAINT TRIGGER` makes it structurally impossible to commit an unbalanced ledger transaction — not just an app-level check. |
| **Deliberate indexing** | Composite index on `(account_id, created_at)`, the exact shape of the balance-lookup query. |
| **Caching with explicit invalidation** | Redis-cached account balances, invalidated on write in the same request that changed them (not TTL-only). |
| **Kubernetes** | Helm chart with HPA (2→6 replicas on CPU), `maxUnavailable: 0` rolling updates, readiness vs. liveness probes backed by Spring Boot Actuator health groups. |
| **CI/CD** | GitHub Actions: build → Testcontainers integration tests against real Postgres → Docker build → push to GHCR → Helm lint/render. |

## Project structure

```
ledger-service/
├── src/main/java/com/portfolio/ledger/
│   ├── entity/        Account, LedgerTransaction, LedgerEntry, OutboxEvent,
│   │                  ReconciliationJob, ProcessorPayoutRow, MismatchFlag
│   ├── service/        LedgerPostingService (core), OutboxRelayService,
│   │                  BalanceCacheService, ReconciliationUploadService,
│   │                  ReconciliationWorkerService
│   ├── controller/     REST API (accounts, transactions, reconciliation)
│   └── repository/     Spring Data JPA
├── src/main/resources/db/migration/   Flyway migrations (schema + the
│                                      balance-invariant trigger live here)
├── src/test/            Testcontainers integration tests (real Postgres,
│                        not mocks) proving the invariants actually hold
├── frontend/            Next.js dashboard — see frontend/README.md
├── helm/ledger-service/ Helm chart for Kubernetes deployment
├── k8s/local/            Postgres + Redis manifests for a local kind cluster
├── scripts/              CSV generator for demo/test data
└── .github/workflows/    CI/CD pipeline
```

## Run the tests

```bash
mvn clean verify
```

`LedgerPostingServiceIT` and `ReconciliationWorkerServiceIT` spin up a real
Postgres via Testcontainers and prove the actual invariants — unbalanced
transactions are rejected, retried idempotency keys don't double-post, and
all four mismatch types are genuinely detected — not just "it compiles."

## Deploy to Kubernetes (local, free — uses `kind`)

No managed cloud account needed — everything runs on a free local cluster.

<details>
<summary>Full walkthrough</summary>

```bash
kind create cluster --name ledger

# No password is committed anywhere in this repo -- create the Postgres
# secret from your local .env first (see k8s/local/README.md):
source .env
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD"

kubectl apply -f k8s/local/postgres.yaml
kubectl apply -f k8s/local/redis.yaml
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis --timeout=120s

docker build -t ledger-service:local .
kind load docker-image ledger-service:local --name ledger

helm install ledger helm/ledger-service \
  --set image.repository=ledger-service \
  --set image.tag=local \
  --set secrets.dbPassword="$DB_PASSWORD"

kubectl rollout status deployment/ledger-ledger-service
kubectl port-forward svc/ledger-ledger-service 8080:80
```

The Helm chart sets `maxUnavailable: 0` on rolling updates (capacity never
drops during a deploy), an HPA scaling 2→6 replicas on CPU, and a readiness
probe against `/actuator/health/readiness` — which fails if the pod can't
reach Postgres or Redis, pulling it out of the Service's endpoints without
killing and restarting it.

</details>

## CI/CD

`.github/workflows/ci.yml` runs on every push: builds, runs the
Testcontainers-backed tests against a real Postgres, builds the Docker
image, pushes to GHCR (free for public repos), then lints and renders the
Helm chart. The actual `helm upgrade --install` deploy step only runs if a
`KUBE_CONFIG` repo secret exists; otherwise it's a clearly-logged no-op, so
the pipeline demonstrates the full path without requiring a cluster running
24/7.

## Design decisions 

- **Outbox pattern instead of publish-after-commit**: a direct publish
  after commit can fail and silently drop an event. The trade-off is added
  complexity (a relay process polling the outbox table), but the ledger and
  downstream notifications can never disagree.
- **`ddl-auto: validate`, never `update`**: the balance-invariant trigger
  can't be expressed as a JPA annotation, so the schema lives in Flyway
  migrations as the single source of truth — Hibernate only validates
  against it.
- **BIGINT cents, never float**: floating point can't round-trip money
  exactly; integers in minor units can.
- **No `@Lock` on the native `SKIP LOCKED` queries**: the native SQL already
  performs the row lock; stacking Spring Data's `@Lock` on top conflicts
  with Hibernate's own lock handling.
- **Reusing `idempotency_key` as the reconciliation join key**: the
  processor's own event/transfer ID is exactly what you'd pass as the
  idempotency key when posting from their webhook in the first place, so no
  separate mapping table is needed.
