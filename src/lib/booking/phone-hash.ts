import "server-only";

import { createHmac } from "node:crypto";

// Keyed digest of a customer phone number, used ONLY as a rate-limit dimension
// in booking_attempts — never as an identifier and never read back.
//
// HMAC, not a bare SHA-256: the Gulf mobile number space is small enough to
// brute-force a plain digest in seconds, which would leave the attempts log
// holding de-facto PII (PDPL). Keying it with the service-role secret — a
// server-only value the app already depends on — makes the digest useless to
// anyone without that key, and avoids introducing another env var to rotate.
export function hashPhone(phone: string): string {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(phone)
    .digest("hex");
}
