// Skeleton shown while the reviews page loads its data on the server.
export default function ReviewsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-line" />
        <div className="h-4 w-64 rounded bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 w-full rounded-2xl bg-paper" />
        <div className="h-20 w-full rounded-2xl bg-paper" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 w-full rounded-2xl bg-paper" />
        ))}
      </div>
    </div>
  );
}
