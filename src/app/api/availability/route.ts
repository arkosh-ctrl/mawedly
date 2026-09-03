import { NextResponse, type NextRequest } from "next/server";
import {
  BookingQueryError,
  getBusinessForBooking,
  getActiveService,
  providerBelongsToBusiness,
  getBookedRanges,
} from "@/lib/booking/queries";
import {
  computeAvailableSlots,
  gulfNow,
  type MinuteRange,
} from "@/lib/booking/availability";
import { logSystemEvent } from "@/lib/admin/log-event";

// Returns ONLY the free start times for a provider/service/date. Other
// customers' appointment details never reach the client.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug") ?? "";
  const providerId = searchParams.get("providerId") ?? "";
  const serviceId = searchParams.get("serviceId") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!slug || !providerId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ slots: [] });
  }

  const business = await getBusinessForBooking(slug);
  if (!business) return NextResponse.json({ slots: [] });

  const service = await getActiveService(business.id, serviceId);
  if (!service) return NextResponse.json({ slots: [] });

  const okProvider = await providerBelongsToBusiness(business.id, providerId);
  if (!okProvider) return NextResponse.json({ slots: [] });

  const now = gulfNow();
  if (date < now.date) return NextResponse.json({ slots: [] });

  // getBookedRanges throws on a DB failure rather than reporting "nothing
  // booked". This endpoint already answers every failure with an empty grid, so
  // keep that contract instead of surfacing an unhandled 500 to the widget —
  // but never silently: an outage reaching the merchant as "no times available"
  // is exactly the failure we must be able to see in the health monitor.
  let booked: MinuteRange[];
  try {
    booked = await getBookedRanges(business.id, providerId, date);
  } catch (e) {
    await logSystemEvent({
      scope: "booking_api",
      event: "availability_query_failed",
      level: "warn",
      meta: {
        code: e instanceof BookingQueryError ? (e.pgCode ?? null) : null,
        error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
      },
      businessId: business.id,
    });
    return NextResponse.json({ slots: [] });
  }

  const slots = computeAvailableSlots({
    workStart: business.work_start,
    workEnd: business.work_end,
    durationMinutes: service.duration_minutes,
    booked,
    minStartMinutes: date === now.date ? now.minutes : 0,
  });

  return NextResponse.json({ slots });
}
