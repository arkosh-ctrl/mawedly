export function StatCard({
  label,
  value,
  hint,
  accent = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "ink" | "pine" | "saffron" | "brick";
}) {
  const bar = {
    ink: "border-t-ink",
    pine: "border-t-pine",
    saffron: "border-t-saffron",
    brick: "border-t-brick",
  }[accent];

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border border-line ${bar} border-t-[3px] bg-paper p-5`}
    >
      <span className="text-xs text-muted">{label}</span>
      <span className="font-display text-2xl font-extrabold tracking-tight text-ink" dir="ltr">
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}
