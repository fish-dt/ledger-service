import type { Account, ReconciliationJob } from "@/lib/api";
import { formatCents, formatRelativeTime } from "@/lib/format";

export function StatementCard({
  clearingAccount,
  lastDoneJob,
  openFlagsCount,
}: {
  clearingAccount: Account | undefined;
  lastDoneJob: ReconciliationJob | undefined;
  openFlagsCount: number;
}) {
  if (!clearingAccount) {
    return (
      <div className="rounded border border-hairline bg-panel-raised p-5">
        <p className="text-sm text-ink-muted">
          Processor Clearing account not found — check the backend is seeded.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-hairline bg-panel-raised p-5">
      <p className="text-sm text-ink-muted">
        Processor Clearing · account #{clearingAccount.id}
      </p>
      <p className="mt-3 font-display text-3xl text-ink">
        {formatCents(clearingAccount.balanceCents)}
      </p>
      <p className="mt-1 text-xs text-ink-faint">balance held pending payout</p>

      <dl className="mt-5 grid grid-cols-2 gap-y-3 border-t border-hairline pt-4 text-sm">
        <dt className="text-ink-muted">Last reconciled</dt>
        <dd className="text-right text-ink">
          {lastDoneJob ? formatRelativeTime(lastDoneJob.createdAt) : "never"}
        </dd>
        <dt className="text-ink-muted">Open flags</dt>
        <dd className={`text-right ${openFlagsCount > 0 ? "text-brand" : "text-ink-faint"}`}>
          {openFlagsCount}
        </dd>
        <dt className="text-ink-muted">Idempotency scope</dt>
        <dd className="text-right text-ink-faint">per processor_ref</dd>
      </dl>
    </div>
  );
}
