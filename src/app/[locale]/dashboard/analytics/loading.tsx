export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-canvas" />
          <div className="h-7 w-48 animate-pulse rounded bg-canvas" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-xl bg-canvas" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-line bg-paper"
          />
        ))}
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-line bg-paper" />
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-paper" />
    </main>
  );
}
