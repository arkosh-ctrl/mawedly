// Social platforms — metadata + share-intent URL builders. V1 is intent-only:
// plain click-to-share URLs, no OAuth, no tokens, no external APIs (the same
// philosophy as lib/whatsapp.ts). Instagram has no web share intent, so its
// flow is "download the card + copy the caption" handled in the UI.

export type SharePlatform =
  | "whatsapp"
  | "x"
  | "telegram"
  | "snapchat"
  | "facebook"
  | "linkedin"
  | "instagram"
  | "native";

// Platforms a merchant can LIST on their public page (profile links).
export type ProfilePlatform =
  | "instagram"
  | "x"
  | "tiktok"
  | "snapchat"
  | "facebook"
  | "linkedin"
  | "youtube";

export const PROFILE_PLATFORMS: ProfilePlatform[] = [
  "instagram",
  "x",
  "tiktok",
  "snapchat",
  "facebook",
  "linkedin",
  "youtube",
];

// Official-ish brand colors, used for the platform chips/icons.
export const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  x: "#111827",
  telegram: "#0088CC",
  snapchat: "#F7C600",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  instagram: "#E4405F",
  tiktok: "#111827",
  youtube: "#FF0000",
  native: "#006bff",
};

export type ShareIntentInput = {
  /** Caption text (already localized / merchant-edited). */
  text: string;
  /** Public link to attach — the business booking page. */
  link: string;
};

// Returns the click-to-share URL for intent platforms, or null when the
// platform has no web intent (instagram / native — handled by the UI).
export function buildShareIntentUrl(
  platform: SharePlatform,
  { text, link }: ShareIntentInput,
): string | null {
  const enc = encodeURIComponent;
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${enc(`${text}\n\n${link}`)}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`;
    case "telegram":
      return `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`;
    case "facebook":
      // Facebook ignores prefilled text; the link's OG data carries the story.
      return `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`;
    case "snapchat":
      return `https://www.snapchat.com/share?link=${enc(link)}`;
    case "instagram":
    case "native":
      return null;
  }
}
