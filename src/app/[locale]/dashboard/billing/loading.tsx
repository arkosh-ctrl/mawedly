// Instant skeleton for the billing page while the server loads the plan + usage.
export default function BillingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-line" />
        <div className="h-4 w-64 rounded bg-line" />
      </div>
      <div className="h-28 w-full rounded-2xl bg-paper" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-paper" />
        ))}
      </div>
    </div>
  );
}
