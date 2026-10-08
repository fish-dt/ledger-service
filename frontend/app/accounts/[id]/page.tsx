"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccounts, useAccountEntries } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconArrowLeft } from "@/components/icons";
import { formatCents, formatRelativeTime } from "@/lib/format";

const WIDTH = 640;
const HEIGHT = 140;

function BalanceOverTimeChart({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        Not enough entries yet to chart a trend.
      </p>
    );
  }

  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const range = maxY - minY || 1;

  const toSvgX = (i: number) => (i / (points.length - 1)) * WIDTH;
  const toSvgY = (y: number) => HEIGHT - ((y - minY) / range) * (HEIGHT - 20) - 10;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toSvgX(i)} ${toSvgY(p.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Balance over time">
      <path d={path} fill="none" className="stroke-brand" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={toSvgX(i)} cy={toSvgY(p.y)} r={2.5} className="fill-brand" />
      ))}
    </svg>
  );
}

export default function AccountDetailPage({ params }: { params: { id: string } }) {
  const accountId = Number(params.id);
  const accountsQuery = useAccounts();
  const entriesQuery = useAccountEntries(accountId);

  const account = accountsQuery.data?.find((a) => a.id === accountId);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

  // Entries come back newest-first; chart needs chronological order. This
  // is a running total of the entries actually returned, not anchored to
  // an absolute starting balance before them -- labeled as such below.
  const chartPoints = useMemo(() => {
    const chronological = [...entries].reverse();
    let running = 0;
    return chronological.map((e) => {
      running += e.amountCents;
      return { x: new Date(e.createdAt).getTime(), y: running };
    });
  }, [entries]);

  return (
    <>
      <PageHeader title={account?.name ?? `Account #${accountId}`}>
        <Link href="/accounts" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <IconArrowLeft className="h-4 w-4" />
          All accounts
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-4 p-6">
        {account && (
          <div className="rounded border border-hairline bg-panel p-5">
            <p className="text-sm text-ink-muted">Current balance</p>
            <p className="mt-1 font-display text-3xl text-ink">{formatCents(account.balanceCents)}</p>
          </div>
        )}

        <div className="rounded border border-hairline bg-panel p-5">
          <h2 className="mb-1 text-base font-medium text-ink">Running balance</h2>
          <p className="mb-4 text-sm text-ink-muted">
            Cumulative change across the entries below, oldest to newest
          </p>
          {entriesQuery.isLoading ? (
            <div className="h-36 animate-pulse rounded bg-panel-raised" />
          ) : (
            <BalanceOverTimeChart points={chartPoints} />
          )}
        </div>

        <div className="rounded border border-hairline bg-panel">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-base font-medium text-ink">Entries</h2>
          </div>
          {entriesQuery.isLoading ? (
            <TableSkeleton rows={6} />
          ) : entries.length === 0 ? (
            <EmptyState title="No entries yet" description="Nothing has posted to this account." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-normal">Amount</th>
                  <th className="px-5 py-2.5 font-normal">Transaction</th>
                  <th className="px-5 py-2.5 font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                    <td className={`px-5 py-3 ${e.amountCents >= 0 ? "text-ok" : "text-brand"}`}>
                      {formatCents(e.amountCents)}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/transactions/${e.transactionId}`} className="font-mono text-xs text-ink-muted hover:text-ink">
                        {e.transactionId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-faint">{formatRelativeTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
