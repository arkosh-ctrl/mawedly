import { NextResponse, type NextRequest } from "next/server";
import {
  getBusinessForBooking,
  getActiveService,
  providerBelongsToBusiness,
  getBookedRanges,
} from "@/lib/booking/queries";
import { computeAvailableSlots, gulfNow } from "@/lib/booking/availability";

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

  const booked = await getBookedRanges(business.id, providerId, date);
  const slots = computeAvailableSlots({
    workStart: business.work_start,
    workEnd: business.work_end,
    durationMinutes: service.duration_minutes,
    booked,
    minStartMinutes: date === now.date ? now.minutes : 0,
  });

  return NextResponse.json({ slots });
}
