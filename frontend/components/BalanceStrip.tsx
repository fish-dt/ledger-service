import type { Account } from "@/lib/api";
import { formatCents } from "@/lib/format";

const typeLabel: Record<Account["accountType"], string> = {
  PROCESSOR_CLEARING: "clears through the processor",
  MERCHANT_PAYABLE: "owed to merchants",
  PLATFORM_REVENUE: "platform revenue",
  PLATFORM_FEE: "platform fees",
};

export function BalanceStrip({ accounts }: { accounts: Account[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {accounts.map((account) => (
        <div key={account.id} className="rounded border border-hairline bg-panel p-4">
          <p className="text-sm text-ink-muted">{account.name}</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {formatCents(account.balanceCents)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">{typeLabel[account.accountType]}</p>
        </div>
      ))}
    </div>
  );
}
