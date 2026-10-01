# Reconciliation Dashboard

Next.js + Tailwind dashboard for the `ledger-service` backend. Styled to
look like a statement, not a consumer wallet app. **This talks to the real
API** — no mock data. If the backend isn't running, you'll see a clear error
banner instead of fake numbers.

## Run it

The backend must be running first (`docker compose up` from the repo root).
Then:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Opens on `localhost:3000`. See the [main README](../README.md) for the full
end-to-end walkthrough (seeding data, uploading a file, watching it
reconcile).

## How the "live" part works

There's no WebSocket yet — the dashboard polls `GET /api/accounts` and
`GET /api/reconciliation/jobs` every 5 seconds (`components/Dashboard.tsx`).
That's a deliberate, simple choice for a portfolio project: it's honest
about being polling, not pretending to be push, and it's enough to watch a
reconciliation job move from `Pending` → `Processing` → `Done` in real time
on screen.

The backend already publishes every mismatch to a Redis channel
(`ledger:mismatches`) the moment it's found — a natural next step is an SSE
route (`app/api/mismatches/stream/route.ts`) that subscribes to that channel
so the feed updates without a 5-second delay. Not built yet; the polling
version works and is simpler to reason about.

## Uploading a file

The **Upload payout file** button in the top bar opens a native file picker,
`POST`s the CSV to `/api/reconciliation/jobs` as `multipart/form-data`, and
triggers a refresh a couple seconds later (giving the backend's async worker
time to process it). Errors from the API — wrong format, backend not
running — surface directly under the header, not swallowed.

## Fonts

Satoshi and Editorial New are free (Fontshare) but not bundled in this repo.
Download them and drop the files here:

```
public/fonts/Satoshi-Variable.woff2
public/fonts/EditorialNew-Regular.woff2
```

- https://www.fontshare.com/fonts/satoshi
- https://www.fontshare.com/fonts/editorial-new

Without them the fallback stacks in `tailwind.config.js` (system-ui /
Georgia) render correctly — nothing breaks, it just uses the system default
until the files are added.

## Structure

```
app/
  layout.tsx       Root HTML shell, metadata
  page.tsx          Renders <Dashboard /> (that's the whole page)
  globals.css       Tailwind + font-face declarations
components/
  Dashboard.tsx     Client component: fetches, polls, handles upload,
                    derives chart/feed data from the raw API responses
  Sidebar.tsx       Icon-rail nav
  TopBar.tsx        Search + file upload
  BalanceStrip.tsx  Four account cards
  ActivityChart.tsx Hand-rolled SVG bar chart (no charting library)
  JobsTable.tsx     Recent reconciliation jobs
  StatementCard.tsx Processor Clearing account summary
  MismatchFeed.tsx  Flagged discrepancies
  icons.tsx         Six inline SVG icons, one stroke weight
lib/
  api.ts            Typed fetch wrappers — the only place that knows the
                    backend's URL shape
  format.ts          Currency / relative-time formatting
```

## What's deliberately not here

No chart library (four bars, hand-rolled SVG), no icon package, no
CSS-in-JS, no state management library (four `useState` calls cover it), no
mock data left in the codebase.
