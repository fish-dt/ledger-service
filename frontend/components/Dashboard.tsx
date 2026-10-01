"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BalanceStrip } from "./BalanceStrip";
import { ActivityChart } from "./ActivityChart";
import { JobsTable } from "./JobsTable";
import { MismatchFeed } from "./MismatchFeed";
import { StatementCard } from "./StatementCard";
import { getAccounts, getReconciliationJobs, uploadPayoutFile, ApiError } from "@/lib/api";
import type { Account, ReconciliationJob, MismatchFlag } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildActivity(jobs: ReconciliationJob[]) {
  // Bucket the most recent jobs by calendar day, oldest first, so the chart
  // reads left-to-right chronologically even though the API returns newest
  // first.
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

export function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [jobs, setJobs] = useState<ReconciliationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [accountsRes, jobsRes] = await Promise.all([getAccounts(), getReconciliationJobs()]);
      setAccounts(accountsRes);
      setJobs(jobsRes);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof ApiError ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      await uploadPayoutFile(file);
      // The reconciliation worker processes asynchronously (poll every 2s
      // server-side) -- give it a moment, then refresh. The 5s poll loop
      // above will keep picking up progress after this too.
      setTimeout(refresh, 2500);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const allMismatches: MismatchFlag[] = jobs
    .flatMap((job) => job.mismatches)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((m) => m.processorRef.toLowerCase().includes(searchTerm.toLowerCase()));

  const clearingAccount = accounts.find((a) => a.accountType === "PROCESSOR_CLEARING");
  const lastDoneJob = jobs.find((j) => j.status === "DONE");
  const openFlagsCount = jobs.flatMap((j) => j.mismatches).filter((m) => !m.resolved).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-ink-muted">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-base">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onUpload={handleUpload}
          uploading={uploading}
          uploadError={uploadError}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {fetchError && (
            <div className="mb-4 rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
              {fetchError}
            </div>
          )}

          <BalanceStrip accounts={accounts} />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-4">
              <ActivityChart data={buildActivity(jobs)} />
              <JobsTable jobs={jobs} />
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
        </main>
      </div>
    </div>
  );
}
