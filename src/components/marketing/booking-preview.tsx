// Live miniature of the real public booking page (the Phase-2 split card):
// identity rail + numbered flow with a slot grid. On an 8s CSS loop the card
// plays the whole product story — service picked, slot locked, confirmation
// with the deposit badge — via the demo-* classes in globals.css. Pure
// presentation — every string arrives as a prop and nothing is fetched.
// Decorative for screen readers: the surrounding hero copy carries the message.
export function BookingPreview({
  sampleName,
  typeBadge,
  stepService,
  stepTime,
  sampleService,
  sampleServiceMeta,
  confirmed,
  depositPaid,
}: {
  sampleName: string;
  typeBadge: string;
  stepService: string;
  stepTime: string;
  sampleService: string;
  sampleServiceMeta: string;
  confirmed: string;
  depositPaid: string;
}) {
  const times = ["09:00", "10:30", "12:00", "16:30", "18:00", "19:30"];
  const lockedTime = "16:30";

  return (
    <div
      aria-hidden
      className="animate-fade-rise overflow-hidden rounded-2xl border border-line bg-paper shadow-lg"
    >
      <div className="grid grid-cols-[2fr_3fr]">
        {/* Identity rail — inline-start, right in RTL, exactly like /[slug]. */}
        <div className="flex flex-col gap-3 border-e border-line bg-paper p-5 text-ink">
          <span className="h-1 w-8 rounded-full bg-primary" />
          <span className="font-display text-lg font-bold leading-snug">
            {sampleName}
          </span>
          <span className="self-start rounded-full bg-primary-light px-2.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
            {typeBadge}
          </span>
          <span className="font-mono text-xs text-muted" dir="ltr">
            09:00–21:00
          </span>
        </div>

        {/* Booking flow miniature. */}
        <div className="flex flex-col gap-3 p-5">
          <PreviewStep num="01" label={stepService} />
          <div className="demo-pick flex flex-col items-start gap-1 rounded-lg border-2 border-primary bg-primary-light/40 px-3 py-2">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">
                {sampleService}
              </span>
              <span className="demo-dot h-2 w-2 shrink-0 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[0.6875rem] text-muted">
              {sampleServiceMeta}
            </span>
          </div>

          <PreviewStep num="02" label={stepTime} />
          <div className="grid grid-cols-3 gap-1.5">
            {times.map((time) => {
              const locked = time === lockedTime;
              return (
                <span
                  key={time}
                  dir="ltr"
                  className={`rounded-md border px-2 py-1.5 text-center font-mono text-xs ${
                    locked
                      ? "demo-lock border-primary bg-primary font-semibold text-paper"
                      : "border-line bg-paper text-ink"
                  }`}
                >
                  {time}
                </span>
              );
            })}
          </div>

          {/* The signature moment: the chosen slot locks in, deposit paid. */}
          <div className="demo-confirm flex items-center justify-between gap-2 rounded-lg bg-ink px-3 py-2 text-paper">
            <span className="text-xs font-medium">
              {confirmed} · <span dir="ltr" className="font-mono">{lockedTime}</span>
            </span>
            <span className="demo-badge rounded-full bg-success px-2 py-0.5 text-[0.6875rem] font-semibold text-paper">
              {depositPaid}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStep({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="flex size-5 items-center justify-center rounded-full bg-primary-light text-[0.625rem] font-bold text-primary">
        {num.replace(/^0/, "")}
      </span>
      <span className="font-display text-sm font-bold text-ink">{label}</span>
    </div>
  );
}
