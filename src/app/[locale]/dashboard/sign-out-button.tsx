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
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
