import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ReviewForm } from "./review-form";

// Public review page — no authentication. It deliberately reads and shows NO
// appointment data (no customer name, date, or service): the appointment id is
// passed straight to the form, and the database alone decides whether the
// submission is allowed. This keeps the attack surface minimal.
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Review");
  const tNav = await getTranslations("Nav");

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-extrabold tracking-tight text-ink"
          >
            {tNav("brand")}
          </Link>
          <LocaleSwitcher />
        </div>

        <div className="rounded-2xl border border-line bg-paper p-8 shadow-xl shadow-ink/5">
          <span className="eyebrow">{t("subtitle")}</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            {t("title")}
          </h1>

          <div className="mt-6">
            <ReviewForm appointmentId={appointmentId} />
          </div>
        </div>
      </div>
    </main>
  );
}
