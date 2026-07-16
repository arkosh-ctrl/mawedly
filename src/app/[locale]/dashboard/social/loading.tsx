// Instant skeleton for the social-links page while the server loads them.
export default function SocialLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-line" />
        <div className="h-4 w-64 rounded bg-line" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-xl bg-paper" />
        ))}
      </div>
    </div>
  );
}
