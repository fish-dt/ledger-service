"use client";

import { useAccounts } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { formatCents } from "@/lib/format";

const typeLabel: Record<string, string> = {
  PROCESSOR_CLEARING: "Clears through the processor",
  MERCHANT_PAYABLE: "Owed to merchants",
  PLATFORM_REVENUE: "Platform revenue",
  PLATFORM_FEE: "Platform fees",
};

export default function AccountsPage() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  return (
    <>
      <PageHeader title="Accounts" description="Every account in the ledger and its current balance" />
      <div className="p-6">
        {accountsQuery.error && (
          <div className="mb-4 rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
            {(accountsQuery.error as Error).message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accountsQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : accounts.map((a) => (
                <div key={a.id} className="rounded border border-hairline bg-panel p-5">
                  <p className="text-sm text-ink-muted">
                    {a.name} · #{a.id}
                  </p>
                  <p className="mt-2 font-display text-2xl text-ink">{formatCents(a.balanceCents)}</p>
                  <p className="mt-1 text-xs text-ink-faint">{typeLabel[a.accountType]}</p>
                </div>
              ))}
        </div>

        <p className="mt-6 text-sm text-ink-faint">
          Per-account entry history and a balance-over-time chart are planned for the next
          iteration — the backend endpoint for that doesn&apos;t exist yet.
        </p>
      </div>
    </>
  );
}
