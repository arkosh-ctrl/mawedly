// Instant skeleton for the Contacts page while the server loads contacts,
// lists, and custom fields.
export default function ContactsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-line" />
        <div className="h-4 w-72 rounded bg-line" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex w-full flex-col gap-2 lg:w-56 lg:shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-full rounded-lg bg-paper" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-10 w-full rounded-lg bg-paper" />
          <div className="h-72 w-full rounded-2xl bg-paper" />
        </div>
      </div>
    </div>
  );
}
