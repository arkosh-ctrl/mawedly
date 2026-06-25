// Skeleton shown while the services page loads its data on the server.
export default function ServicesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-neutral-200" />
        <div className="h-4 w-64 rounded bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-md bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
