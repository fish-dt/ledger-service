export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoModeBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-brand-dim bg-brand-dim/40 px-6 py-2 text-xs text-brand"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
      Demo data — this deploy isn&apos;t connected to a live backend. Every action here runs
      against an in-memory fixture store for this browser tab only.
    </div>
  );
}
