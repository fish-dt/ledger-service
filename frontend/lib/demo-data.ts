import type {
  Account,
  MismatchFlag,
  ReconciliationJob,
  TransactionDetail,
  PostTransactionBody,
  AccountEntry,
  OutboxEvent,
} from "./api";

// In-memory only -- resets on page reload. This exists so a public deploy
// with no live backend (NEXT_PUBLIC_DEMO_MODE=true) still behaves like a
// real product: resolving a mismatch actually toggles it, posting a
// transaction actually changes a balance, for the lifetime of the tab.
// It is NOT a substitute for the real backend's guarantees -- the balance
// invariant enforced here is a JS reimplementation of the same rule the
// Postgres trigger enforces, kept deliberately in sync, see postTransaction()
// below.

let accounts: Account[] = [
  { id: 1, name: "Processor Clearing", accountType: "PROCESSOR_CLEARING", balanceCents: 48_231_00 },
  { id: 2, name: "Merchant Payable", accountType: "MERCHANT_PAYABLE", balanceCents: -46_802_50 },
  { id: 3, name: "Platform Revenue", accountType: "PLATFORM_REVENUE", balanceCents: 1_214_00 },
  { id: 4, name: "Platform Fee", accountType: "PLATFORM_FEE", balanceCents: 214_50 },
];

const transactions = new Map<string, TransactionDetail>();
const idempotencyIndex = new Map<string, string>(); // idempotencyKey -> transaction id
let nextMismatchId = 100;

function seedTransaction(id: string, idempotencyKey: string, entries: TransactionDetail["entries"], hoursAgo: number) {
  const txn: TransactionDetail = {
    id,
    idempotencyKey,
    description: "demo payout",
    createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    entries,
    deduped: false,
  };
  transactions.set(id, txn);
  idempotencyIndex.set(idempotencyKey, id);
}

seedTransaction(
  "11111111-1111-1111-1111-111111111111",
  "po_demo_a1b2c3d4e5f6",
  [
    { accountId: 1, amountCents: -10000 },
    { accountId: 2, amountCents: 10000 },
  ],
  2
);
seedTransaction(
  "22222222-2222-2222-2222-222222222222",
  "po_demo_f6e5d4c3b2a1",
  [
    { accountId: 1, amountCents: -5000 },
    { accountId: 2, amountCents: 5000 },
  ],
  5
);

let jobs: ReconciliationJob[] = [
  {
    id: 41,
    sourceFile: "stripe_payout_2026-09-24.csv",
    status: "DONE",
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    startedAt: new Date(Date.now() - 2 * 3_600_000 + 500).toISOString(),
    finishedAt: new Date(Date.now() - 2 * 3_600_000 + 2000).toISOString(),
    rowCount: 12,
    mismatches: [
      {
        id: nextMismatchId++,
        processorRef: "po_9f2c1a8b3e7d",
        mismatchType: "AMOUNT_MISMATCH",
        processorAmountCents: 4999,
        internalAmountCents: 5000,
        createdAt: new Date(Date.now() - 2 * 3_600_000 + 1000).toISOString(),
        resolved: false,
      },
      {
        id: nextMismatchId++,
        processorRef: "po_1b7e4d2a9c31",
        mismatchType: "MISSING_PROCESSOR",
        processorAmountCents: null,
        internalAmountCents: 7500,
        createdAt: new Date(Date.now() - 2 * 3_600_000 + 1100).toISOString(),
        resolved: false,
      },
      {
        id: nextMismatchId++,
        processorRef: "po_ae03f61b8d45",
        mismatchType: "MISSING_INTERNAL",
        processorAmountCents: 12000,
        internalAmountCents: null,
        createdAt: new Date(Date.now() - 2 * 3_600_000 + 1200).toISOString(),
        resolved: false,
      },
      {
        id: nextMismatchId++,
        processorRef: "po_5c8a2e9f1b06",
        mismatchType: "DUPLICATE",
        processorAmountCents: 3200,
        internalAmountCents: null,
        createdAt: new Date(Date.now() - 2 * 3_600_000 + 1300).toISOString(),
        resolved: true,
      },
    ],
  },
  {
    id: 40,
    sourceFile: "stripe_payout_2026-09-23.csv",
    status: "DONE",
    createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    startedAt: new Date(Date.now() - 26 * 3_600_000 + 500).toISOString(),
    finishedAt: new Date(Date.now() - 26 * 3_600_000 + 2000).toISOString(),
    rowCount: 9,
    mismatches: [],
  },
];

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const demo = {
  getAccounts: () => delay(accounts.map((a) => ({ ...a }))),

  getReconciliationJobs: () => delay(jobs.map((j) => ({ ...j, mismatches: [...j.mismatches] }))),

  getReconciliationJob: (id: number) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return Promise.reject(new Error(`Reconciliation job ${id} not found`));
    return delay({ ...job, mismatches: [...job.mismatches] });
  },

  getTransaction: (id: string) => {
    const txn = transactions.get(id);
    if (!txn) return Promise.reject(new Error(`Transaction ${id} not found`));
    return delay({ ...txn });
  },

  // Reimplements the same rule src/.../LedgerPostingService.java enforces:
  // idempotency dedup, then "entries must sum to zero." Kept intentionally
  // simple and in sync with the real check, specifically so the /post demo
  // shows an accurate rejection message when the backend is unreachable.
  postTransaction: (body: PostTransactionBody): Promise<TransactionDetail> => {
    const existingId = idempotencyIndex.get(body.idempotencyKey);
    if (existingId) {
      const existing = transactions.get(existingId)!;
      return delay({ ...existing, deduped: true });
    }

    const sum = body.entries.reduce((acc, e) => acc + e.amountCents, 0);
    if (sum !== 0) {
      return Promise.reject(
        new Error(`Transaction entries sum to ${sum} cents; must sum to 0`)
      );
    }

    const id = crypto.randomUUID();
    const txn: TransactionDetail = {
      id,
      idempotencyKey: body.idempotencyKey,
      description: body.description ?? null,
      createdAt: new Date().toISOString(),
      entries: body.entries,
      deduped: false,
    };
    transactions.set(id, txn);
    idempotencyIndex.set(body.idempotencyKey, id);

    accounts = accounts.map((a) => {
      const entry = body.entries.find((e) => e.accountId === a.id);
      return entry ? { ...a, balanceCents: a.balanceCents + entry.amountCents } : a;
    });

    return delay(txn);
  },

  updateMismatch: (id: number, resolved: boolean): Promise<MismatchFlag> => {
    let updated: MismatchFlag | undefined;
    jobs = jobs.map((job) => ({
      ...job,
      mismatches: job.mismatches.map((m) => {
        if (m.id === id) {
          updated = { ...m, resolved };
          return updated;
        }
        return m;
      }),
    }));
    if (!updated) return Promise.reject(new Error(`Mismatch ${id} not found`));
    return delay(updated);
  },

  getAccountEntries: (accountId: number): Promise<AccountEntry[]> => {
    const entries: AccountEntry[] = [];
    let id = 1000;
    for (const txn of transactions.values()) {
      const entry = txn.entries.find((e) => e.accountId === accountId);
      if (entry) {
        entries.push({
          id: id++,
          amountCents: entry.amountCents,
          createdAt: txn.createdAt,
          transactionId: txn.id,
        });
      }
    }
    return delay(entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  },

  getOutboxEvents: (): Promise<OutboxEvent[]> => {
    const events: OutboxEvent[] = Array.from(transactions.values()).map((txn, i) => ({
      id: i + 1,
      transactionId: txn.id,
      eventType: "LEDGER_TRANSACTION_POSTED",
      published: true,
      createdAt: txn.createdAt,
      publishedAt: txn.createdAt,
    }));
    return delay(events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  },

  uploadPayoutFile: (file: File): Promise<ReconciliationJob> => {
    const newJob: ReconciliationJob = {
      id: Math.max(...jobs.map((j) => j.id)) + 1,
      sourceFile: file.name,
      status: "DONE",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      rowCount: 10,
      mismatches: [
        {
          id: nextMismatchId++,
          processorRef: "po_demo_upload_1",
          mismatchType: "AMOUNT_MISMATCH",
          processorAmountCents: 1999,
          internalAmountCents: 2000,
          createdAt: new Date().toISOString(),
          resolved: false,
        },
      ],
    };
    jobs = [newJob, ...jobs];
    return delay(newJob, 800);
  },
};
