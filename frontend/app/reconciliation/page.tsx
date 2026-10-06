"use client";

import { useReconciliationJobs } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { JobsTable } from "@/components/JobsTable";
import { UploadPanel } from "@/components/UploadPanel";

export default function ReconciliationPage() {
  const jobsQuery = useReconciliationJobs();

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Processor payouts matched against the internal ledger"
      />
      <div className="flex flex-col gap-4 p-6">
        {jobsQuery.error && (
          <div className="rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
            {(jobsQuery.error as Error).message}
          </div>
        )}

        <UploadPanel />

        {jobsQuery.isLoading ? (
          <div className="rounded border border-hairline bg-panel">
            <TableSkeleton />
          </div>
        ) : (
          <JobsTable jobs={jobsQuery.data ?? []} title="All reconciliation jobs" />
        )}
      </div>
    </>
  );
}
