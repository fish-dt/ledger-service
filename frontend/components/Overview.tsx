"use client";

import { useAccounts, useReconciliationJobs } from "@/lib/queries";
import { PageHeader } from "./ui/PageHeader";
import { BalanceStrip } from "./BalanceStrip";
import { ActivityChart } from "./ActivityChart";
import { JobsTable } from "./JobsTable";
import { MismatchFeed } from "./MismatchFeed";
import { StatementCard } from "./StatementCard";
import { CardSkeleton, TableSkeleton } from "./ui/Skeleton";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildActivity(jobs: { createdAt: string; rowCount: number; mismatches: unknown[] }[]) {
  const byDay = new Map<string, { day: string; matched: number; flagged: number }>();
  for (const job of jobs) {
    const date = new Date(job.createdAt);
    const key = date.toDateString();
    const matched = Math.max(job.rowCount - job.mismatches.length, 0);
    const flagged = job.mismatches.length;
    const existing = byDay.get(key);
    if (existing) {
      existing.matched += matched;
      existing.flagged += flagged;
    } else {
      byDay.set(key, { day: WEEKDAY[date.getDay()], matched, flagged });
    }
  }
  return Array.from(byDay.values()).reverse().slice(-7);
}

export function Overview() {
  const accountsQuery = useAccounts();
  const jobsQuery = useReconciliationJobs();

  const accounts = accountsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const allMismatches = jobs
    .flatMap((j) => j.mismatches)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const clearingAccount = accounts.find((a) => a.accountType === "PROCESSOR_CLEARING");
  const lastDoneJob = jobs.find((j) => j.status === "DONE");
  const openFlagsCount = jobs.flatMap((j) => j.mismatches).filter((m) => !m.resolved).length;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Account balances, reconciliation activity, and open flags at a glance"
      />
      <div className="p-6">
        {(accountsQuery.error || jobsQuery.error) && (
          <div className="mb-4 rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
            {(accountsQuery.error as Error)?.message || (jobsQuery.error as Error)?.message}
          </div>
        )}

        {accountsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <BalanceStrip accounts={accounts} />
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <ActivityChart data={buildActivity(jobs)} />
            {jobsQuery.isLoading ? (
              <div className="rounded border border-hairline bg-panel">
                <TableSkeleton />
              </div>
            ) : (
              <JobsTable jobs={jobs.slice(0, 5)} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <StatementCard
              clearingAccount={clearingAccount}
              lastDoneJob={lastDoneJob}
              openFlagsCount={openFlagsCount}
            />
            <MismatchFeed mismatches={allMismatches} />
          </div>
        </div>
      </div>
    </>
  );
}
