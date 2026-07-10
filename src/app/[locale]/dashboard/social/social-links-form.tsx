"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PROFILE_PLATFORMS } from "@/lib/social/platforms";
import { PlatformIcon } from "@/components/social/platform-icon";
import { saveSocialLinks } from "./actions";

// One field per platform; empty = remove. Uncontrolled inputs + a single
// server action keep this deliberately lean (no rhf needed for 7 URLs).

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

const PLACEHOLDERS: Record<string, string> = {
  instagram: "https://instagram.com/yourname",
  x: "https://x.com/yourname",
  tiktok: "https://tiktok.com/@yourname",
  snapchat: "https://snapchat.com/add/yourname",
  facebook: "https://facebook.com/yourpage",
  linkedin: "https://linkedin.com/in/yourname",
  youtube: "https://youtube.com/@yourchannel",
};

export function SocialLinksForm({
  initialLinks,
}: {
  initialLinks: Record<string, string>;
}) {
  const t = useTranslations("Social");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSocialLinks(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 shadow-sm"
    >
      {PROFILE_PLATFORMS.map((platform) => (
        <label
          key={platform}
          className="flex flex-col gap-1.5 text-sm font-medium text-ink"
        >
          <span className="flex items-center gap-2">
            <span className="text-muted">
              <PlatformIcon platform={platform} size={16} />
            </span>
            {PLATFORM_LABELS[platform]}
          </span>
          <input
            name={platform}
            type="url"
            dir="ltr"
            defaultValue={initialLinks[platform] ?? ""}
            placeholder={PLACEHOLDERS[platform]}
            className="rounded-lg border border-line bg-paper px-3 py-2.5 text-start text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 self-start rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
