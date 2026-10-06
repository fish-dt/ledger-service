import Link from "next/link";
import type { ReconciliationJob } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { JobStatusBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";

export function JobsTable({ jobs, title = "Recent reconciliation jobs" }: { jobs: ReconciliationJob[]; title?: string }) {
  return (
    <div className="rounded border border-hairline bg-panel">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-base font-medium text-ink">{title}</h2>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No reconciliation jobs yet"
          description="Upload a payout file to get started, or run scripts/generate_payout_csv.py to seed some."
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="px-5 py-2.5 font-normal">File</th>
              <th className="px-5 py-2.5 font-normal">Rows</th>
              <th className="px-5 py-2.5 font-normal">Mismatches</th>
              <th className="px-5 py-2.5 font-normal">Status</th>
              <th className="px-5 py-2.5 font-normal">Run</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-5 py-3">
                  <Link href={`/reconciliation/${job.id}`} className="text-ink hover:text-brand">
                    {job.sourceFile}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-muted">{job.rowCount || "—"}</td>
                <td className="px-5 py-3">
                  {job.mismatches.length > 0 ? (
                    <span className="text-brand">{job.mismatches.length}</span>
                  ) : (
                    <span className="text-ink-faint">0</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-5 py-3 text-ink-faint">{formatRelativeTime(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
