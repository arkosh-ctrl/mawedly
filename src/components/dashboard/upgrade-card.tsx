import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Locked-feature placeholder — shown in place of a page/section the current
// plan doesn't include. Server component (async translations).

export async function UpgradeCard({
  featureTitle,
  featureBody,
}: {
  featureTitle: string;
  featureBody: string;
}) {
  const t = await getTranslations("Billing.upgradeCard");
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper px-6 py-14 text-center shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h2 className="font-display text-xl font-bold text-ink">{featureTitle}</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted">{featureBody}</p>
      <Link
        href="/dashboard/billing"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
