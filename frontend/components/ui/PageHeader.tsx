export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-normal text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
