"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PasswordForm } from "./password-form";
import { MagicLinkForm } from "./magic-link-form";

// Hosts the toggle between the two sign-in methods. Password is the primary,
// default method; Magic Link remains available as a secondary tab. A client
// component is needed because the parent login page is a Server Component.
export function AuthTabs({ next }: { next: string }) {
  const t = useTranslations("Login");
  const [method, setMethod] = useState<"password" | "magic">("password");

  const tabClass = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-ink text-paper" : "text-muted hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        className="flex gap-1 rounded-full border border-line bg-canvas p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={method === "password"}
          onClick={() => setMethod("password")}
          className={tabClass(method === "password")}
        >
          {t("passwordTab")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "magic"}
          onClick={() => setMethod("magic")}
          className={tabClass(method === "magic")}
        >
          {t("magicLinkTab")}
        </button>
      </div>

      {method === "password" ? (
        <PasswordForm next={next} />
      ) : (
        <MagicLinkForm next={next} />
      )}
    </div>
  );
}
