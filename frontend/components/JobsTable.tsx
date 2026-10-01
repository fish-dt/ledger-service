import type { ReconciliationJob } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const statusStyle: Record<ReconciliationJob["status"], string> = {
  DONE: "bg-ok-dim text-ok",
  PROCESSING: "bg-panel-raised text-ink-muted",
  PENDING: "bg-panel-raised text-ink-muted",
  FAILED: "bg-brand-dim text-brand",
};

export function JobsTable({ jobs }: { jobs: ReconciliationJob[] }) {
  return (
    <div className="rounded border border-hairline bg-panel">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-base font-medium text-ink">Recent reconciliation jobs</h2>
      </div>

      {jobs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          No reconciliation jobs yet. Upload a payout file above, or run{" "}
          <code className="rounded bg-panel-raised px-1.5 py-0.5 text-xs text-ink">
            scripts/generate_payout_csv.py
          </code>{" "}
          to seed some.
        </p>
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
              <tr key={job.id} className="border-b border-hairline last:border-0">
                <td className="px-5 py-3 text-ink">{job.sourceFile}</td>
                <td className="px-5 py-3 text-ink-muted">{job.rowCount || "—"}</td>
                <td className="px-5 py-3">
                  {job.mismatches.length > 0 ? (
                    <span className="text-brand">{job.mismatches.length}</span>
                  ) : (
                    <span className="text-ink-faint">0</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[job.status]}`}>
                    {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                  </span>
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
