"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEventStream } from "@/lib/useEventStream";
import { useOutboxEvents } from "@/lib/queries";
import { isDemoMode, type OutboxEvent } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { IconCheck, IconClock } from "@/components/icons";

export default function EventsPage() {
  const { events, connected, usingFallback } = useEventStream();
  const outboxQuery = useOutboxEvents();
  const [liveOutbox, setLiveOutbox] = useState<OutboxEvent[]>([]);

  useEffect(() => {
    if (outboxQuery.data) setLiveOutbox(outboxQuery.data);
  }, [outboxQuery.data]);

  // When a live "outbox" event arrives, move the matching row from
  // Pending to Published -- or add it fresh if we hadn't seen it yet.
  useEffect(() => {
    const latest = events[0];
    if (!latest || latest.type !== "outbox") return;
    try {
      const payload = JSON.parse(latest.data);
      const txnId: string | undefined = payload.transactionId;
      if (!txnId) return;
      setLiveOutbox((prev) => {
        const exists = prev.some((o) => o.transactionId === txnId);
        if (exists) {
          return prev.map((o) =>
            o.transactionId === txnId ? { ...o, published: true, publishedAt: latest.receivedAt } : o
          );
        }
        return [
          {
            id: Date.now(),
            transactionId: txnId,
            eventType: "LEDGER_TRANSACTION_POSTED",
            published: true,
            createdAt: latest.receivedAt,
            publishedAt: latest.receivedAt,
          },
          ...prev,
        ];
      });
    } catch {
      // not JSON we recognize -- ignore
    }
  }, [events]);

  const pending = liveOutbox.filter((o) => !o.published);
  const published = liveOutbox.filter((o) => o.published);

  return (
    <>
      <PageHeader title="Live events" description="Outbox relay and reconciliation events as they happen">
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-ok" : "bg-ink-faint"}`}
            aria-hidden="true"
          />
          {connected ? (usingFallback ? "Connected (polling)" : "Connected (live)") : "Disconnected"}
        </span>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="rounded border border-hairline bg-panel">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-base font-medium text-ink">Outbox</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Written in the same transaction as each ledger entry, then relayed to Redis —
                watch rows move from Pending to Published
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-hairline">
              <div>
                <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-2 text-xs text-ink-muted">
                  <IconClock className="h-3 w-3" /> Pending ({pending.length})
                </div>
                <ul>
                  {pending.length === 0 && (
                    <li className="px-4 py-6 text-center text-xs text-ink-faint">Nothing pending</li>
                  )}
                  {pending.map((o) => (
                    <li key={o.id} className="border-b border-hairline px-4 py-2 last:border-0">
                      <p className="truncate font-mono text-xs text-ink">{o.transactionId}</p>
                      <p className="text-xs text-ink-faint">{formatRelativeTime(o.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-2 text-xs text-ok">
                  <IconCheck className="h-3 w-3" /> Published ({published.length})
                </div>
                <ul>
                  {published.length === 0 && (
                    <li className="px-4 py-6 text-center text-xs text-ink-faint">Nothing published yet</li>
                  )}
                  {published.slice(0, 15).map((o) => (
                    <li key={o.id} className="border-b border-hairline px-4 py-2 last:border-0">
                      <p className="truncate font-mono text-xs text-ink">{o.transactionId}</p>
                      <p className="text-xs text-ink-faint">
                        {o.publishedAt ? formatRelativeTime(o.publishedAt) : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded border border-hairline bg-panel">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-base font-medium text-ink">Live feed</h2>
            {isDemoMode() && (
              <p className="mt-0.5 text-xs text-brand">Simulated — no live backend connected</p>
            )}
          </div>
          {events.length === 0 ? (
            <EmptyState
              title="Waiting for events"
              description="Post a transaction or upload a payout file to see something here."
            />
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="border-b border-hairline px-4 py-2.5 last:border-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        e.type === "mismatch" ? "bg-brand-dim text-brand" : "bg-ok-dim text-ok"
                      }`}
                    >
                      {e.type}
                    </span>
                    <span className="text-xs text-ink-faint">{formatRelativeTime(e.receivedAt)}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-ink-muted">{e.data}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
