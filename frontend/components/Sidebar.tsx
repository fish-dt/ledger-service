"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLedger, IconReconcile, IconAccounts, IconFlag, IconSettings, IconClock } from "./icons";

const items = [
  { href: "/", icon: IconLedger, label: "Overview" },
  { href: "/reconciliation", icon: IconReconcile, label: "Reconciliation" },
  { href: "/accounts", icon: IconAccounts, label: "Accounts" },
  { href: "/post", icon: IconFlag, label: "Post a transaction" },
  { href: "/events", icon: IconClock, label: "Live events" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex w-14 flex-col items-center gap-1 border-r border-hairline bg-panel py-4"
    >
      <Link
        href="/"
        aria-label="Overview"
        className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-brand text-base font-display text-sm font-medium"
      >
        L
      </Link>
      {items.map(({ href, icon: Icon, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
              active
                ? "bg-panel-raised text-ink"
                : "text-ink-faint hover:bg-panel-raised hover:text-ink-muted"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </Link>
        );
      })}
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
