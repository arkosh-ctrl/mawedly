"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const PERIODS = [7, 30, 90] as const;

/**
 * Period picker. Writes the choice to the `period` search param and navigates,
 * so the server component re-fetches and recomputes — the analytics stay fully
 * server-rendered (no client data fetching).
 */
export function PeriodSelect({ current }: { current: number }) {
  const t = useTranslations("Analytics");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={current}
      onChange={(e) =>
        router.push(`${pathname}?period=${e.target.value}`)
      }
      aria-label={t("period")}
      className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-saffron"
    >
      {PERIODS.map((p) => (
        <option key={p} value={p}>
          {t(`period_${p}d`)}
        </option>
      ))}
    </select>
  );
}
