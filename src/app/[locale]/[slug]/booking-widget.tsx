"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicProvider, PublicService } from "@/lib/booking/queries";
import { buildWhatsappLink } from "@/lib/whatsapp";

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
  "rounded-md border border-neutral-300 px-3 py-2 text-start outline-none focus:border-neutral-500";
const labelClass = "flex flex-col gap-1 text-sm";

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

    return (
      <div className="flex flex-col gap-4 rounded-md border border-green-300 bg-green-50 p-5">
        <h2 className="text-lg font-semibold text-green-800">
          {t("success.title")}
        </h2>
        <p className="text-sm text-green-900">{t("success.instructions")}</p>

        <dl className="flex flex-col gap-2 text-sm">
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
            className="size-40 self-start rounded-md border border-neutral-200 object-contain"
          />
        )}

        {/* Opens the merchant's WhatsApp with a prefilled message (wa.me only).
            Hidden quietly when the merchant has no usable number. */}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {t("whatsappButton")}
          </a>
        )}
      </div>
    );
  }

  const canSubmit =
    Boolean(serviceId && providerId && date && slot && name.trim() && phone.trim()) &&
    !submitting;

  return (
    <div className="flex flex-col gap-4">
      <label className={labelClass}>
        <span>{t("fields.service")}</span>
        <select
          className={inputClass}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">{t("placeholders.service")}</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration_minutes} {t("minutesShort")} · {Number(s.price)}{" "}
              {t("currency")}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span>{t("fields.provider")}</span>
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

      <label className={labelClass}>
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
        <div className="flex flex-col gap-2">
          <span className="text-sm">{t("fields.time")}</span>
          {slotsLoading ? (
            <p className="text-sm opacity-70">{t("loadingSlots")}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm opacity-70">{t("noSlots")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  dir="ltr"
                  onClick={() => setSlot(s)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    slot === s
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      <label className={labelClass}>
        <span>{t("fields.emailOptional")}</span>
        <input
          className={inputClass}
          dir="ltr"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(`errors.${error}`)}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
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
      <dt className="opacity-70">{label}</dt>
      <dd className={mono ? "font-mono" : ""} dir={mono ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
