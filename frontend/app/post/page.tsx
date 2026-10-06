"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconPlus, IconTrash, IconCheck, IconAlert } from "@/components/icons";
import { useAccounts } from "@/lib/queries";
import { postTransaction, ApiError } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { parseDollarsToCents } from "@/lib/money";
import { postTransactionFormSchema } from "@/lib/schemas";

type Line = { accountId: number | ""; amount: string };

function newIdempotencyKey() {
  return `po_demo_${crypto.randomUUID().slice(0, 12)}`;
}

const BALANCED_EXAMPLE: Line[] = [
  { accountId: 1, amount: "10.00" },
  { accountId: 2, amount: "-10.00" },
];

const UNBALANCED_EXAMPLE: Line[] = [
  { accountId: 1, amount: "10.00" },
  { accountId: 2, amount: "-9.99" },
];

export default function PostPage() {
  const router = useRouter();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>(BALANCED_EXAMPLE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rejection, setRejection] = useState<string | null>(null);
  const [sendTwiceResult, setSendTwiceResult] = useState<
    { call: number; id: string; deduped: boolean }[] | null
  >(null);

  const postMutation = useMutation({
    mutationFn: postTransaction,
    onSuccess: (txn) => {
      toast.success(txn.deduped ? "Already posted — returned the existing transaction" : "Transaction posted");
      router.push(`/transactions/${txn.id}`);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Failed to post transaction";
      setRejection(message);
      toast.error("Rejected", { description: message });
    },
  });

  const sendTwiceMutation = useMutation({
    mutationFn: async () => {
      const entries = lines.map((l) => ({
        accountId: l.accountId as number,
        amountCents: parseDollarsToCents(l.amount)!,
      }));
      const key = newIdempotencyKey();
      const first = await postTransaction({ idempotencyKey: key, description, entries });
      const second = await postTransaction({ idempotencyKey: key, description, entries });
      return [
        { call: 1, id: first.id, deduped: first.deduped },
        { call: 2, id: second.id, deduped: second.deduped },
      ];
    },
    onSuccess: (result) => {
      setSendTwiceResult(result);
      toast.success("Same key, sent twice — one ledger entry, two identical IDs back");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to run the idempotency demo");
    },
  });

  const sum = lines.reduce((acc, l) => {
    const cents = parseDollarsToCents(l.amount);
    return cents === null ? acc : acc + cents;
  }, 0);
  const allLinesParse = lines.every((l) => parseDollarsToCents(l.amount) !== null);
  const isBalanced = allLinesParse && sum === 0;

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { accountId: "", amount: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRejection(null);
    setSendTwiceResult(null);

    const parsed = postTransactionFormSchema.safeParse({
      idempotencyKey,
      description,
      entries: lines.map((l) => ({ accountId: l.accountId, amount: l.amount })),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(parsed.error.issues[0]?.message ?? "Check the form for errors");
      return;
    }
    setFieldErrors({});

    const entries = lines.map((l) => ({
      accountId: l.accountId as number,
      amountCents: parseDollarsToCents(l.amount)!,
    }));

    postMutation.mutate({ idempotencyKey, description: description || undefined, entries });
  }

  return (
    <>
      <PageHeader
        title="Post a transaction"
        description="Every write in this system goes through one path — see what it actually enforces"
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLines(BALANCED_EXAMPLE)}
              className="rounded border border-hairline px-3 py-1.5 text-xs text-ink-muted hover:bg-panel-raised hover:text-ink"
            >
              Fill a balanced example
            </button>
            <button
              type="button"
              onClick={() => setLines(UNBALANCED_EXAMPLE)}
              className="rounded border border-hairline px-3 py-1.5 text-xs text-ink-muted hover:bg-panel-raised hover:text-ink"
            >
              Fill an unbalanced example (watch it get rejected)
            </button>
          </div>

          <div className="rounded border border-hairline bg-panel p-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-ink-muted">Idempotency key</span>
                <input
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="mt-1 w-full rounded border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm text-ink-muted">Description (optional)</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-ink-muted">Entry lines</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                >
                  <IconPlus className="h-3.5 w-3.5" /> Add line
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(i, { accountId: Number(e.target.value) })}
                      aria-label={`Account for entry line ${i + 1}`}
                      className="flex-1 rounded border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={line.amount}
                      onChange={(e) => updateLine(i, { amount: e.target.value })}
                      placeholder="10.00"
                      aria-label={`Amount for entry line ${i + 1}`}
                      className="w-32 rounded border border-hairline bg-panel-raised px-3 py-2 text-right text-sm text-ink focus:border-brand focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 2}
                      aria-label={`Remove entry line ${i + 1}`}
                      className="rounded p-2 text-ink-faint hover:bg-panel-raised hover:text-brand disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {fieldErrors.entries && (
                <p className="mt-2 text-xs text-brand">{fieldErrors.entries}</p>
              )}
            </div>

            <div
              className={`mt-4 flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                isBalanced
                  ? "border-ok-dim bg-ok-dim/30 text-ok"
                  : "border-brand-dim bg-brand-dim/20 text-brand"
              }`}
              aria-live="polite"
            >
              {isBalanced ? <IconCheck className="h-4 w-4" /> : <IconAlert className="h-4 w-4" />}
              {allLinesParse
                ? isBalanced
                  ? "Balanced — entries sum to $0.00"
                  : `Unbalanced — entries sum to ${sum < 0 ? "-" : ""}$${Math.abs(sum / 100).toFixed(2)}, not $0.00`
                : "Enter a valid amount on every line"}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={postMutation.isPending}
                className="rounded bg-brand px-4 py-2 text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {postMutation.isPending ? "Posting…" : "Post transaction"}
              </button>
              <button
                type="button"
                onClick={() => sendTwiceMutation.mutate()}
                disabled={!isBalanced || sendTwiceMutation.isPending}
                className="rounded border border-hairline px-4 py-2 text-sm text-ink hover:bg-panel-raised disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendTwiceMutation.isPending ? "Sending…" : "Send twice (idempotency demo)"}
              </button>
            </div>
          </div>

          {rejection && (
            <div className="rounded border border-brand-dim bg-brand-dim/20 p-4 text-sm">
              <p className="font-medium text-brand">Rejected by the server</p>
              <p className="mt-1 text-ink-muted">{rejection}</p>
              <p className="mt-2 text-xs text-ink-faint">
                This is the application-level check in <code>LedgerPostingService</code> —
                it fails fast before any database write. A second, independent safeguard
                (a Postgres <code>CONSTRAINT TRIGGER</code>) enforces the same rule at the
                database level, so even a bug that skipped this check couldn&apos;t commit
                an unbalanced transaction.
              </p>
            </div>
          )}

          {sendTwiceResult && (
            <div className="rounded border border-ok-dim bg-ok-dim/20 p-4 text-sm">
              <p className="font-medium text-ok">Same idempotency key, two calls, one ledger entry</p>
              <div className="mt-2 flex flex-col gap-1 font-mono text-xs text-ink-muted">
                {sendTwiceResult.map((r) => (
                  <p key={r.call}>
                    Call {r.call} → <span className="text-ink">{r.id}</span>{" "}
                    {r.deduped ? "(deduped — already existed)" : "(created)"}
                  </p>
                ))}
              </div>
            </div>
          )}
        </form>

        <aside className="rounded border border-hairline bg-panel p-5 text-sm text-ink-muted">
          <h2 className="mb-2 text-base font-medium text-ink">What this proves</h2>
          <ul className="flex flex-col gap-3">
            <li>
              <span className="text-ink">Balance invariant.</span> Entries must sum to zero.
              Try the unbalanced example — the rejection you see is the same check that
              runs in production, not a UI-only guess.
            </li>
            <li>
              <span className="text-ink">Idempotency.</span> &ldquo;Send twice&rdquo; posts the
              identical request twice. The second call returns the first call&apos;s result
              instead of creating a second entry — the way a retried payment webhook
              should behave.
            </li>
            <li>
              <span className="text-ink">Money, precisely.</span> Amounts are parsed from
              the input string straight to integer cents — no floating-point arithmetic
              touches the value anywhere in this form.
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
