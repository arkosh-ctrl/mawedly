import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CustomerChatView } from "./CustomerChatView";

// Public chat page — no authentication, no server-side existence check (same
// shell and access model as /review/[appointmentId]). The appointment id is
// passed straight to CustomerChatView; the chat server actions
// (lib/chat/actions.ts) and the DB trigger are the sole authority on whether
// the thread is open. No appointment data is fetched or shown here.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Chat.customer");
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
            <CustomerChatView appointmentId={appointmentId} />
          </div>
        </div>
      </div>
    </main>
  );
}
