import type { MismatchFlag, MismatchType } from "@/lib/api";
import { formatCents, formatRelativeTime } from "@/lib/format";
import { ResolvedBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";

const typeCopy: Record<MismatchType, string> = {
  AMOUNT_MISMATCH: "Amount disagrees",
  MISSING_INTERNAL: "Not in our ledger",
  MISSING_PROCESSOR: "Not in payout file",
  DUPLICATE: "Duplicate reference",
};

export function MismatchFeed({ mismatches }: { mismatches: MismatchFlag[] }) {
  const open = mismatches.filter((m) => !m.resolved);

  return (
    <div className="rounded border border-hairline bg-panel">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-base font-medium text-ink">Flagged for review</h2>
        <span className="rounded bg-brand-dim px-2 py-0.5 text-xs text-brand">
          {open.length} open
        </span>
      </div>

      {mismatches.length === 0 ? (
        <EmptyState title="Nothing flagged" description="Every reconciled row matched cleanly." />
      ) : (
        <ul>
          {mismatches.slice(0, 8).map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{m.processorRef}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{typeCopy[m.mismatchType]}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                <p className="text-sm text-ink">
                  {formatCents(m.processorAmountCents ?? m.internalAmountCents ?? 0)}
                </p>
                <ResolvedBadge resolved={m.resolved} />
                <p className="text-xs text-ink-faint">{formatRelativeTime(m.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
