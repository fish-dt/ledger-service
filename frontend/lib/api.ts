const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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
  constructor(message: string, public status?: number) {
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
    const body = await res.text().catch(() => "");
    throw new ApiError(`${res.status} ${res.statusText}: ${body}`, res.status);
  }
  return res.json();
}

export function getAccounts(): Promise<Account[]> {
  return request<Account[]>("/api/accounts");
}

export function getReconciliationJobs(): Promise<ReconciliationJob[]> {
  return request<ReconciliationJob[]>("/api/reconciliation/jobs");
}

export async function uploadPayoutFile(file: File): Promise<ReconciliationJob> {
  const formData = new FormData();
  formData.append("file", file);
  return request<ReconciliationJob>("/api/reconciliation/jobs", {
    method: "POST",
    body: formData,
  });
}

export { ApiError };
