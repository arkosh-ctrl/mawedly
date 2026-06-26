// wa.me link helpers. No WhatsApp Business API, no tokens, no webhooks — these
// just build a click-to-chat URL that opens the merchant's WhatsApp with a
// prefilled message. Both functions return null (never throw) when the phone
// can't be confidently turned into an international number, so callers can hide
// the button quietly instead of rendering a broken link.

// GCC dialing codes: Saudi, UAE, Bahrain, Qatar, Kuwait, Oman.
const GULF_DIAL_CODES = ["966", "971", "973", "974", "965", "968"];

// Returns the phone as international digits (no "+", no leading zero), or null.
// businesses.phone is stored digits-only but without an enforced country code,
// so we accept already-international Gulf numbers and convert Saudi local forms.
export function normalizePhoneForWhatsapp(phone: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // "00966..." international prefix -> drop the leading "00".
  const noTrunk = digits.startsWith("00") ? digits.slice(2) : digits;

  // Already international with a known Gulf code.
  if (
    GULF_DIAL_CODES.some((code) => noTrunk.startsWith(code)) &&
    noTrunk.length >= 11 &&
    noTrunk.length <= 15
  ) {
    return noTrunk;
  }

  // Saudi local mobile: 05XXXXXXXX (10 digits) -> 9665XXXXXXXX.
  if (/^05\d{8}$/.test(digits)) {
    return "966" + digits.slice(1);
  }

  // Saudi mobile without the leading zero: 5XXXXXXXX (9 digits) -> 9665XXXXXXXX.
  if (/^5\d{8}$/.test(digits)) {
    return "966" + digits;
  }

  return null;
}

// Builds the full wa.me link, or null if the phone is unusable.
export function buildWhatsappLink(
  phone: string,
  message: string,
): string | null {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
