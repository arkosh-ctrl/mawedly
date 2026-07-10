"use client";

import { useLocale, useTranslations } from "next-intl";
import { signOut } from "./actions";

export function SignOutButton() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();

  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="rounded-full border border-line px-3 py-1 text-sm text-ink transition-colors hover:border-muted"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
