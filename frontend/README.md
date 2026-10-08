# Reconciliation Dashboard

Multi-route Next.js app that works as a product tour of the backend's
guarantees — each page proves something specific the ledger service does,
rather than just displaying data.

## Run it

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Needs the backend running first (`docker compose up` from the repo root) —
or set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to run with no backend
at all (see "Demo mode" below).

## Routes (Tier 1)

| Route | What it proves |
|---|---|
| `/` | Overview — balances, recent jobs, open mismatches |
| `/post` | **Try to break it**: post a transaction, watch an unbalanced one get rejected by the real server-side check. **Idempotency demo**: "Send twice" fires the same request twice, shows one ledger entry came of it |
| `/transactions/[id]` | Debit/credit breakdown with the Σdebits = Σcredits proof made visible |
| `/reconciliation` | Jobs list + CSV upload with a client-side preview (every row validated before the file is sent) |
| `/reconciliation/[jobId]` | Mismatch triage — filter by type/status (both in the URL via nuqs, so it's shareable and back-button safe), sortable table, resolve/ignore with optimistic updates, bulk actions |
| `/accounts`, `/accounts/[id]` | Account list and detail — entry history plus a running-balance chart |
| `/events` | Live feed over SSE (outbox relay + reconciliation events), and an outbox visualizer showing rows move from Pending to Published in real time |

## Demo mode

Set `NEXT_PUBLIC_DEMO_MODE=true` and every API call serves from an
in-memory fixture store (`lib/demo-data.ts`) instead of a real backend. This
is for a public deploy with no live Spring Boot instance behind it. A
banner says so at the top of every page. Mutations actually work —
resolving a mismatch, posting a transaction — for the lifetime of the
browser tab; it resets on reload. The balance-sum check in demo mode is a
JS reimplementation of the same rule `LedgerPostingService.java` enforces,
kept deliberately simple and in sync.



## Typed client / OpenAPI

The backend exposes `/v3/api-docs` (springdoc, just added). Once it's
running:

```bash
npm run generate:api
```

generates `lib/schema.d.ts` from the live spec. **Not yet wired up** — the
app still uses the hand-written types in `lib/api.ts`, which are accurate
to the DTOs as of this change but not machine-verified against the backend.
Swapping to the generated types is a mechanical follow-up, not a redesign.
