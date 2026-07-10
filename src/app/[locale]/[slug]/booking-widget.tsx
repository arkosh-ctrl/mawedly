"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PublicProvider, PublicService } from "@/lib/booking/queries";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { AddToCalendar } from "@/components/calendar/add-to-calendar";

type TransferInfo = {
  bankName: string | null;
  iban: string | null;
  accountName: string | null;
  qrUrl: string | null;
};

type BookingResult = {
  appointmentId: string;
  deposit: number;
  whatsappPhone: string | null;
  transfer: TransferInfo;
};

const inputClass =
  "rounded-lg border border-line bg-paper px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-light";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

// Above this count, choice cards/chips would sprawl — fall back to a select.
const CARD_CHOICE_MAX = 6;

export function BookingWidget({
  slug,
  services,
  providers,
}: {
  slug: string;
  services: PublicService[];
  providers: PublicProvider[];
}) {
  const t = useTranslations("Booking");
  // locale isn't passed down from page.tsx today, so it's read the same way
  // the chat components do (useParams + "ar" fallback) rather than adding a
  // prop that would mean touching the parent page.
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "ar";

  const [serviceId, setServiceId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const [receiptState, setReceiptState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch availability whenever service + provider + date are all chosen.
  useEffect(() => {
    setSlot("");
    setSlots([]);
    if (!serviceId || !providerId || !date) return;

    let cancelled = false;
    setSlotsLoading(true);
    const params = new URLSearchParams({ slug, serviceId, providerId, date });
    fetch(`/api/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { slots?: string[] }) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, serviceId, providerId, date]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          providerId,
          date,
          startTime: slot,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult(data as BookingResult);
      } else {
        setError(String(data.error ?? "generic"));
      }
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadReceipt(file: File) {
    if (!result) return;
    setReceiptError(null);
    setReceiptState("uploading");
    try {
      const fd = new FormData();
      fd.set("appointmentId", result.appointmentId);
      fd.set("file", file);
      const res = await fetch("/api/deposit", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReceiptState("done");
      } else {
        setReceiptError(String(data.error ?? "generic"));
        setReceiptState("error");
      }
    } catch {
      setReceiptError("generic");
      setReceiptState("error");
    }
  }

  if (result) {
    const service = services.find((s) => s.id === serviceId);
    const whatsappLink = result.whatsappPhone
      ? buildWhatsappLink(
          result.whatsappPhone,
          t("whatsappMessage", {
            service: service?.name ?? "",
            date,
            time: slot,
            ref: result.appointmentId.slice(0, 8),
          }),
        )
      : null;
    const chatUrl = `/${locale}/chat/${result.appointmentId}`;

    return (
      <div className="animate-fade-rise flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-light text-base font-bold text-success"
            aria-hidden
          >
            ✓
          </span>
          <h2 className="font-display text-lg font-bold text-ink">
            {t("success.title")}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {t("success.instructions")}
        </p>

        <dl className="flex flex-col gap-2 rounded-xl border border-line bg-canvas p-4 text-sm">
          <Row label={t("success.deposit")} value={`${result.deposit} ${t("currency")}`} />
          {result.transfer.bankName && (
            <Row label={t("fields.bankName")} value={result.transfer.bankName} />
          )}
          {result.transfer.accountName && (
            <Row label={t("fields.accountName")} value={result.transfer.accountName} />
          )}
          {result.transfer.iban && (
            <Row label={t("fields.iban")} value={result.transfer.iban} mono />
          )}
        </dl>

        {result.transfer.qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.transfer.qrUrl}
            alt={t("fields.qr")}
            className="size-40 self-start rounded-xl border border-line bg-paper object-contain p-1"
          />
        )}

        {/* Deposit-receipt upload. Goes through /api/deposit (service-role) since
            the customer is anonymous and can't write to the private bucket. */}
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <span className="text-sm font-semibold text-ink">
            {t("receipt.title")}
          </span>
          <p className="text-xs text-muted">{t("receipt.hint")}</p>
          {receiptState === "done" ? (
            <p className="rounded-lg border border-success/30 bg-success-light px-3 py-2 text-sm font-medium text-success">
              {t("receipt.done")}
            </p>
          ) : (
            <>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={receiptState === "uploading"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadReceipt(f);
                }}
                className="text-sm text-ink file:me-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-paper"
              />
              {receiptState === "uploading" && (
                <p className="text-xs text-muted">{t("receipt.uploading")}</p>
              )}
              {receiptState === "error" && receiptError && (
                <p className="text-xs text-brick">
                  {t(`receipt.errors.${receiptError}`)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Opens the merchant's WhatsApp with a prefilled message (wa.me only).
            Hidden quietly when the merchant has no usable number. */}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
          >
            {t("whatsappButton")}
          </a>
        )}

        {/* Plain link, no modal — the chat page (/chat/[appointmentId]) is its
            own capability-URL page, same access model as the review link. */}
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-muted"
        >
          {t("chatButton")}
        </a>

        {/* Add the appointment to the customer's calendar (ICS / Google). */}
        <AddToCalendar appointmentId={result.appointmentId} />
      </div>
    );
  }

  const canSubmit =
    Boolean(serviceId && providerId && date && slot && name.trim() && phone.trim()) &&
    !submitting;

  return (
    <div className="flex flex-col gap-5">
      {/* 01 — service. Choice cards for a short menu; select beyond that. */}
      <StepHeading num="01" label={t("steps.service")} first />
      {services.length <= CARD_CHOICE_MAX ? (
        <div
          role="group"
          aria-label={t("fields.service")}
          className="grid gap-2 sm:grid-cols-2"
        >
          {services.map((s) => {
            const active = serviceId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setServiceId(s.id)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-start transition-colors ${
                  active
                    ? "border-primary bg-primary-light/40"
                    : "border-line bg-paper hover:border-muted"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {s.name}
                  </span>
                  {active && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="font-mono text-xs text-muted">
                  {s.duration_minutes} {t("minutesShort")} · {Number(s.price)}{" "}
                  {t("currency")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <label className={labelClass}>
          <span className="sr-only">{t("fields.service")}</span>
          <select
            className={inputClass}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">{t("placeholders.service")}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} {t("minutesShort")} ·{" "}
                {Number(s.price)} {t("currency")}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* 02 — provider & date. Pill chips for a short roster. */}
      <StepHeading num="02" label={t("steps.providerDate")} />
      {providers.length <= CARD_CHOICE_MAX ? (
        <div
          role="group"
          aria-label={t("fields.provider")}
          className="flex flex-wrap gap-2"
        >
          {providers.map((p) => {
            const active = providerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setProviderId(p.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary font-semibold text-paper"
                    : "border-line bg-paper text-ink hover:border-muted"
                }`}
              >
                {p.name}
                {p.title ? ` — ${p.title}` : ""}
              </button>
            );
          })}
        </div>
      ) : (
        <label className={labelClass}>
          <span className="sr-only">{t("fields.provider")}</span>
          <select
            className={inputClass}
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            <option value="">{t("placeholders.provider")}</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.title ? ` — ${p.title}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={`${labelClass} sm:max-w-xs`}>
        <span>{t("fields.date")}</span>
        <input
          type="date"
          dir="ltr"
          min={today}
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {serviceId && providerId && date && (
        <div className="flex flex-col gap-3">
          {/* 03 — time. The slot grid is the product's signature: a precise
              daybook of available times, the selection set in tabular mono. */}
          <StepHeading num="03" label={t("steps.time")} />
          {slotsLoading ? (
            <p className="text-sm text-muted">{t("loadingSlots")}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">{t("noSlots")}</p>
          ) : (
            <div className="animate-fade-rise grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  dir="ltr"
                  aria-pressed={slot === s}
                  onClick={() => setSlot(s)}
                  className={`rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
                    slot === s
                      ? "border-primary bg-primary font-semibold text-paper"
                      : "border-line bg-paper text-primary hover:border-primary hover:bg-primary-light/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 04 — customer details. */}
      <StepHeading num="04" label={t("steps.details")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>{t("fields.name")}</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className={labelClass}>
          <span>{t("fields.phone")}</span>
          <input
            className={inputClass}
            dir="ltr"
            inputMode="tel"
            placeholder="9665XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          <span>{t("fields.emailOptional")}</span>
          <input
            className={inputClass}
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick">
          {t(`errors.${error}`)}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="w-full rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-paper shadow-sm transition-all hover:scale-[1.01] hover:bg-primary-hover disabled:opacity-50 disabled:hover:scale-100"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}

// Numbered step heading — the mono figure in saffron gives the flow its
// daybook rhythm; a hairline rule separates steps after the first.
function StepHeading({
  num,
  label,
  first,
}: {
  num: string;
  label: string;
  first?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 ${
        first ? "" : "border-t border-line pt-5"
      }`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-[0.6875rem] font-bold text-primary">
        {num.replace(/^0/, "")}
      </span>
      <span className="font-display text-base font-bold text-ink">{label}</span>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd
        className={mono ? "font-mono text-ink" : "font-medium text-ink"}
        dir={mono ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
