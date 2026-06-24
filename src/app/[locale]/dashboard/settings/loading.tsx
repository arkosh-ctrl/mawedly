// Skeleton shown while the settings page loads its data on the server.
export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-neutral-200" />
        <div className="h-4 w-64 rounded bg-neutral-200" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-4 w-28 rounded bg-neutral-200" />
            <div className="h-10 w-full rounded-md bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
