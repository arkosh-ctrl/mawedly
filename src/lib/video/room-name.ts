import "server-only";

import { createHmac } from "crypto";

// Deterministic, unguessable room identity derived from the appointment id and
// a server-only secret. Same appointment always yields the same room name and
// password — so the merchant button, the customer page, and the confirmation
// email all agree without storing or transmitting anything extra. On
// meet.jit.si the room password can't be enforced via URL; it's shown to both
// sides as guidance and the merchant sets it (Lobby) manually. The room name's
// secrecy is the primary guard.

function hmacHex(input: string): string {
  const secret = process.env.ROOM_SECRET;
  if (!secret) throw new Error("ROOM_SECRET is required");
  return createHmac("sha256", secret).update(input).digest("hex");
}

export function deriveRoomName(appointmentId: string): string {
  return `mawedly-${hmacHex(`room:${appointmentId}`).slice(0, 24)}`;
}

export function deriveRoomPassword(appointmentId: string): string {
  return hmacHex(`pass:${appointmentId}`).slice(0, 8).toUpperCase();
}
