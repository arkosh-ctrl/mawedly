// Static miniature of the real public booking page (the Phase-2 split card):
// dark identity rail + numbered flow with a slot grid, one slot locking in
// with the deposit badge. Pure presentation — every string arrives as a prop
// and nothing is fetched; what the visitor sees here is what merchants get.
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
      className="animate-fade-rise overflow-hidden rounded-2xl border border-line bg-paper shadow-xl shadow-ink/5"
    >
      <div className="grid grid-cols-[2fr_3fr]">
        {/* Identity rail — inline-start, right in RTL, exactly like /[slug]. */}
        <div className="flex flex-col gap-3 bg-ink p-5 text-paper">
          <span className="h-1 w-8 rounded-full bg-saffron" />
          <span className="font-display text-lg font-extrabold leading-snug">
            {sampleName}
          </span>
          <span className="self-start rounded-full border border-pine px-2.5 py-0.5 text-[0.6875rem] font-semibold text-canvas">
            {typeBadge}
          </span>
          <span className="font-mono text-xs text-canvas" dir="ltr">
            09:00–21:00
          </span>
        </div>

        {/* Booking flow miniature. */}
        <div className="flex flex-col gap-3 p-5">
          <PreviewStep num="01" label={stepService} />
          <div className="flex flex-col items-start gap-1 rounded-lg border-2 border-ink bg-canvas px-3 py-2">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">
                {sampleService}
              </span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-saffron" />
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
                      ? "border-ink bg-ink font-semibold text-paper"
                      : "border-line bg-canvas text-ink"
                  }`}
                >
                  {time}
                </span>
              );
            })}
          </div>

          {/* The signature moment: the chosen slot locks in, deposit paid. */}
          <div className="animate-slot-lock flex items-center justify-between gap-2 rounded-lg bg-ink px-3 py-2 text-paper">
            <span className="text-xs font-medium">
              {confirmed} · <span dir="ltr" className="font-mono">{lockedTime}</span>
            </span>
            <span className="rounded-full bg-saffron px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">
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
      <span className="font-mono text-[0.6875rem] font-bold tracking-widest text-saffron">
        {num}
      </span>
      <span className="font-display text-sm font-bold text-ink">{label}</span>
    </div>
  );
}
