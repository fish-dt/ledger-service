import { IconCheck, IconAlert, IconClock, IconLoader } from "../icons";

type Tone = "ok" | "brand" | "muted";

const toneClasses: Record<Tone, string> = {
  ok: "bg-ok-dim text-ok",
  brand: "bg-brand-dim text-brand",
  muted: "bg-panel-raised text-ink-muted",
};

export function StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

const jobStatusConfig = {
  DONE: { tone: "ok" as const, icon: <IconCheck className="h-3 w-3" />, label: "Done" },
  PROCESSING: { tone: "muted" as const, icon: <IconLoader className="h-3 w-3 animate-spin" />, label: "Processing" },
  PENDING: { tone: "muted" as const, icon: <IconClock className="h-3 w-3" />, label: "Pending" },
  FAILED: { tone: "brand" as const, icon: <IconAlert className="h-3 w-3" />, label: "Failed" },
};

export function JobStatusBadge({ status }: { status: keyof typeof jobStatusConfig }) {
  const config = jobStatusConfig[status];
  return (
    <StatusBadge tone={config.tone} icon={config.icon}>
      {config.label}
    </StatusBadge>
  );
}

export function ResolvedBadge({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <StatusBadge tone="ok" icon={<IconCheck className="h-3 w-3" />}>
      Resolved
    </StatusBadge>
  ) : (
    <StatusBadge tone="brand" icon={<IconAlert className="h-3 w-3" />}>
      Open
    </StatusBadge>
  );
}
