import type { MismatchFlag, MismatchType } from "@/lib/api";
import { formatCents, formatRelativeTime } from "@/lib/format";
import { IconCheck } from "./icons";

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
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          Nothing flagged. Every reconciled row matched cleanly.
        </p>
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
              <div className="flex flex-shrink-0 items-center gap-2 text-right">
                <div>
                  <p className="text-sm text-ink">
                    {formatCents(m.processorAmountCents ?? m.internalAmountCents ?? 0)}
                  </p>
                  <p className="text-xs text-ink-faint">{formatRelativeTime(m.createdAt)}</p>
                </div>
                {m.resolved && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok-dim text-ok">
                    <IconCheck className="h-3 w-3" />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
