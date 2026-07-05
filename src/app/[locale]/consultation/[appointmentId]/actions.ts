"use server";

import { resolveVideoAccess, recordJoin } from "@/lib/video/access";

// Record the customer entering the room. No auth — possession of the
// appointment id is the capability (same model as chat/review). We re-validate
// the room is open before recording, so a stale link can't write.
export async function recordClientVideoJoin(
  appointmentId: string,
): Promise<void> {
  const resolved = await resolveVideoAccess(appointmentId, "client");
  if (!resolved) return;
  await recordJoin(appointmentId, "client");
}
