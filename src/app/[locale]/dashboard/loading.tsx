// Skeleton for the dashboard overview — shown instantly on navigation while the
// server fetches the business, usage, insights, and stats.
export default function OverviewLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded bg-line" />
        <div className="h-4 w-72 rounded bg-line" />
      </div>
      <div className="h-24 w-full rounded-2xl bg-paper" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="h-56 rounded-2xl bg-paper lg:col-span-5" />
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="h-16 rounded-xl bg-paper" />
          <div className="h-16 rounded-xl bg-paper" />
          <div className="h-16 rounded-xl bg-paper" />
        </div>
      </div>
    </div>
  );
}
