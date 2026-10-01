import { IconLedger, IconReconcile, IconAccounts, IconFlag, IconSettings } from "./icons";

const items = [
  { icon: IconLedger, label: "Ledger", active: true },
  { icon: IconReconcile, label: "Reconciliation", active: false },
  { icon: IconAccounts, label: "Accounts", active: false },
  { icon: IconFlag, label: "Flags", active: false },
];

export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-14 flex-col items-center gap-1 border-r border-hairline bg-panel py-4"
    >
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-brand text-base font-display text-sm font-medium">
        L
      </div>
      {items.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
            active
              ? "bg-panel-raised text-ink"
              : "text-ink-faint hover:bg-panel-raised hover:text-ink-muted"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      ))}
      <div className="mt-auto">
        <button
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded text-ink-faint hover:bg-panel-raised hover:text-ink-muted"
        >
          <IconSettings className="h-[18px] w-[18px]" />
        </button>
      </div>
    </nav>
  );
}
