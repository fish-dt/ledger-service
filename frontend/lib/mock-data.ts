// Shaped to match /api/accounts, /api/reconciliation/jobs and the
// ledger:mismatches Redis payload one-for-one, so replacing these with real
// fetch() calls to the Spring Boot service later requires no reshaping.

export type Account = {
  id: number;
  name: string;
  accountType: "PROCESSOR_CLEARING" | "MERCHANT_PAYABLE" | "PLATFORM_REVENUE" | "PLATFORM_FEE";
  balanceCents: number;
};

export const accounts: Account[] = [
  { id: 1, name: "Processor Clearing", accountType: "PROCESSOR_CLEARING", balanceCents: 48_231_00 },
  { id: 2, name: "Merchant Payable", accountType: "MERCHANT_PAYABLE", balanceCents: -46_802_50 },
  { id: 3, name: "Platform Revenue", accountType: "PLATFORM_REVENUE", balanceCents: 1_214_00 },
  { id: 4, name: "Platform Fee", accountType: "PLATFORM_FEE", balanceCents: 214_50 },
];

export type MismatchType = "AMOUNT_MISMATCH" | "MISSING_INTERNAL" | "MISSING_PROCESSOR" | "DUPLICATE";

export type MismatchFlag = {
  id: number;
  processorRef: string;
  mismatchType: MismatchType;
  processorAmountCents: number | null;
  internalAmountCents: number | null;
  createdAt: string;
  resolved: boolean;
};

export const recentMismatches: MismatchFlag[] = [
  { id: 1, processorRef: "po_9f2c1a8b3e7d", mismatchType: "AMOUNT_MISMATCH", processorAmountCents: 4999, internalAmountCents: 5000, createdAt: "2026-09-24T14:02:00Z", resolved: false },
  { id: 2, processorRef: "po_1b7e4d2a9c31", mismatchType: "MISSING_PROCESSOR", processorAmountCents: null, internalAmountCents: 7500, createdAt: "2026-09-24T13:47:00Z", resolved: false },
  { id: 3, processorRef: "po_ae03f61b8d45", mismatchType: "MISSING_INTERNAL", processorAmountCents: 12000, internalAmountCents: null, createdAt: "2026-09-24T13:31:00Z", resolved: false },
  { id: 4, processorRef: "po_5c8a2e9f1b06", mismatchType: "DUPLICATE", processorAmountCents: 3200, internalAmountCents: null, createdAt: "2026-09-24T12:58:00Z", resolved: true },
  { id: 5, processorRef: "po_7d4f0e3c2a88", mismatchType: "AMOUNT_MISMATCH", processorAmountCents: 18999, internalAmountCents: 19000, createdAt: "2026-09-24T12:20:00Z", resolved: true },
];

export type ReconciliationJob = {
  id: number;
  sourceFile: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  rowCount: number;
  mismatchCount: number;
  createdAt: string;
};

export const recentJobs: ReconciliationJob[] = [
  { id: 41, sourceFile: "stripe_payout_2026-09-24.csv", status: "DONE", rowCount: 214, mismatchCount: 3, createdAt: "2026-09-24T14:02:00Z" },
  { id: 40, sourceFile: "stripe_payout_2026-09-23.csv", status: "DONE", rowCount: 198, mismatchCount: 0, createdAt: "2026-09-23T14:00:00Z" },
  { id: 39, sourceFile: "stripe_payout_2026-09-22.csv", status: "DONE", rowCount: 201, mismatchCount: 1, createdAt: "2026-09-22T14:01:00Z" },
  { id: 38, sourceFile: "stripe_payout_2026-09-21.csv", status: "FAILED", rowCount: 0, mismatchCount: 0, createdAt: "2026-09-21T14:03:00Z" },
  { id: 37, sourceFile: "stripe_payout_2026-09-20.csv", status: "DONE", rowCount: 187, mismatchCount: 2, createdAt: "2026-09-20T14:00:00Z" },
];

// Last 7 days of reconciliation activity: matched rows vs flagged rows,
// per day -- this is what the bar chart plots.
export const activityByDay = [
  { day: "Mon", matched: 176, flagged: 2 },
  { day: "Tue", matched: 201, flagged: 0 },
  { day: "Wed", matched: 168, flagged: 1 },
  { day: "Thu", matched: 190, flagged: 4 },
  { day: "Fri", matched: 0, flagged: 0 },
  { day: "Sat", matched: 214, flagged: 3 },
  { day: "Sun", matched: 187, flagged: 2 },
];
