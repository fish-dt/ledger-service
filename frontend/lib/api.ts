import { demo } from "./demo-data";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Set on the public deploy when there's no live backend behind it (see
// README "Demo mode"). Checked at the top of every exported function below
// rather than in a single branch point, so each function's real-vs-demo
// behavior stays easy to read in place.
export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export type Account = {
  id: number;
  name: string;
  accountType: "PROCESSOR_CLEARING" | "MERCHANT_PAYABLE" | "PLATFORM_REVENUE" | "PLATFORM_FEE";
  balanceCents: number;
};

export type MismatchType = "AMOUNT_MISMATCH" | "MISSING_INTERNAL" | "MISSING_PROCESSOR" | "DUPLICATE";

export type MismatchFlag = {
  id: number;
  processorRef: string;
  mismatchType: MismatchType;
  processorAmountCents: number | null;
  internalAmountCents: number | null;
  resolved: boolean;
  createdAt: string;
};

export type ReconciliationJob = {
  id: number;
  sourceFile: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  rowCount: number;
  mismatches: MismatchFlag[];
};

class ApiError extends Error {
  // serverMessage is the backend's own GlobalExceptionHandler "error" field,
  // when present -- that's the human-readable message worth showing someone
  // on the /post "try to break it" page, as opposed to the generic HTTP
  // status wrapper.
  constructor(message: string, public status?: number, public serverMessage?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      `Can't reach the API at ${API_BASE}. Is the Spring Boot app running (docker compose up)?`
    );
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    let serverMessage: string | undefined;
    try {
      const parsed = JSON.parse(bodyText);
      if (typeof parsed.error === "string") serverMessage = parsed.error;
    } catch {
      // not JSON -- leave serverMessage undefined, callers fall back to the raw text
    }
    throw new ApiError(
      serverMessage ?? `${res.status} ${res.statusText}: ${bodyText}`,
      res.status,
      serverMessage
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getAccounts(): Promise<Account[]> {
  if (isDemoMode()) return demo.getAccounts();
  return request<Account[]>("/api/accounts");
}

export function getReconciliationJobs(): Promise<ReconciliationJob[]> {
  if (isDemoMode()) return demo.getReconciliationJobs();
  return request<ReconciliationJob[]>("/api/reconciliation/jobs");
}

export async function uploadPayoutFile(file: File): Promise<ReconciliationJob> {
  if (isDemoMode()) return demo.uploadPayoutFile(file);
  const formData = new FormData();
  formData.append("file", file);
  return request<ReconciliationJob>("/api/reconciliation/jobs", {
    method: "POST",
    body: formData,
  });
}

export function getReconciliationJob(id: number): Promise<ReconciliationJob> {
  if (isDemoMode()) return demo.getReconciliationJob(id);
  return request<ReconciliationJob>(`/api/reconciliation/jobs/${id}`);
}

export function getTransaction(id: string): Promise<TransactionDetail> {
  if (isDemoMode()) return demo.getTransaction(id);
  return request<TransactionDetail>(`/api/transactions/${id}`);
}

export async function postTransaction(body: PostTransactionBody): Promise<TransactionDetail> {
  if (isDemoMode()) {
    try {
      return await demo.postTransaction(body);
    } catch (err) {
      throw new ApiError(err instanceof Error ? err.message : "Failed to post transaction");
    }
  }
  return request<TransactionDetail>("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateMismatch(id: number, resolved: boolean): Promise<MismatchFlag> {
  if (isDemoMode()) return demo.updateMismatch(id, resolved);
  return request<MismatchFlag>(`/api/reconciliation/mismatches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resolved }),
  });
}

export type AccountEntry = {
  id: number;
  amountCents: number;
  createdAt: string;
  transactionId: string;
};

export function getAccountEntries(accountId: number): Promise<AccountEntry[]> {
  if (isDemoMode()) return demo.getAccountEntries(accountId);
  return request<AccountEntry[]>(`/api/accounts/${accountId}/entries`);
}

export type OutboxEvent = {
  id: number;
  transactionId: string;
  eventType: string;
  published: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export function getOutboxEvents(): Promise<OutboxEvent[]> {
  if (isDemoMode()) return demo.getOutboxEvents();
  return request<OutboxEvent[]>("/api/events/outbox");
}

// The SSE endpoint itself isn't proxied through demo mode's request() --
// EventSource makes its own connection, so the /events page checks
// isDemoMode() directly and skips connecting at all, showing simulated
// events instead. See components/EventFeed.tsx.
export function eventsStreamUrl(): string {
  return `${API_BASE}/api/events/stream`;
}

export type TransactionDetail = {
  id: string;
  idempotencyKey: string;
  description: string | null;
  createdAt: string;
  entries: { accountId: number; amountCents: number }[];
  deduped: boolean;
};

export type PostTransactionBody = {
  idempotencyKey: string;
  description?: string;
  entries: { accountId: number; amountCents: number }[];
};

export { ApiError };
