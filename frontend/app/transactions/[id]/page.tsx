"use client";

import Link from "next/link";
import { useAccounts, useTransaction } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { IconArrowLeft, IconCheck } from "@/components/icons";
import { formatCents } from "@/lib/format";

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const txnQuery = useTransaction(params.id);
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `Account #${id}`;

  const txn = txnQuery.data;
  const sum = txn?.entries.reduce((acc, e) => acc + e.amountCents, 0) ?? 0;

  return (
    <>
      <PageHeader title="Transaction">
        <Link
          href="/post"
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <IconArrowLeft className="h-4 w-4" />
          Post another
        </Link>
      </PageHeader>

      <div className="p-6">
        {txnQuery.isLoading && (
          <div className="rounded border border-hairline bg-panel">
            <TableSkeleton rows={3} />
          </div>
        )}

        {txnQuery.error && (
          <div className="rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
            {(txnQuery.error as Error).message}
          </div>
        )}

        {txn && (
          <div className="max-w-2xl rounded border border-hairline bg-panel">
            <div className="border-b border-hairline px-5 py-4">
              <p className="font-mono text-xs text-ink-faint">{txn.id}</p>
              <p className="mt-1 text-sm text-ink-muted">
                key: <span className="text-ink">{txn.idempotencyKey}</span>
                {txn.description && <> · {txn.description}</>}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-normal">Account</th>
                  <th className="px-5 py-2.5 text-right font-normal">Debit</th>
                  <th className="px-5 py-2.5 text-right font-normal">Credit</th>
                </tr>
              </thead>
              <tbody>
                {txn.entries.map((e, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-3 text-ink">{accountName(e.accountId)}</td>
                    <td className="px-5 py-3 text-right text-ok">
                      {e.amountCents > 0 ? formatCents(e.amountCents) : ""}
                    </td>
                    <td className="px-5 py-3 text-right text-brand">
                      {e.amountCents < 0 ? formatCents(Math.abs(e.amountCents)) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-2 border-t border-hairline bg-panel-raised px-5 py-3 text-sm text-ok">
              <IconCheck className="h-4 w-4" />
              Σ debits = Σ credits = {formatCents(Math.abs(sum) === 0 ? 0 : sum)} — this
              transaction could not have been committed otherwise.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
