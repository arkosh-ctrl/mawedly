// Unified dashboard page header: mono eyebrow, Tajawal display title, optional
// mono subline. Closed with a hairline rule so every page opens the same way.
export function PageHeader({
  eyebrow,
  title,
  subline,
  sublineDir,
}: {
  eyebrow?: string;
  title: string;
  subline?: React.ReactNode;
  sublineDir?: "ltr" | "rtl";
}) {
  return (
    <header className="flex flex-col gap-1.5 border-b border-line pb-5">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {subline && (
        <p className="font-mono text-sm text-muted" dir={sublineDir}>
          {subline}
        </p>
      )}
    </header>
  );
}
