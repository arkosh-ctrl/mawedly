import { buildWhatsappLink } from "@/lib/whatsapp";
import { emailLayout, detailRow, escapeHtml, type EmailLang } from "./layout";

// "Booking confirmed" email for the customer. Includes a wa.me link to the
// merchant, built with the same helper used by the public confirmation screen.
export function bookingCustomerConfirmedEmail(p: {
  lang: EmailLang;
  businessName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  whatsappPhone: string | null;
}): { subject: string; html: string; text: string } {
  const time = p.time.slice(0, 5);

  const waMessage =
    p.lang === "en"
      ? `Hello, regarding my confirmed ${p.serviceName} appointment on ${p.date} at ${time}.`
      : `السلام عليكم، بخصوص موعدي المؤكد (${p.serviceName}) يوم ${p.date} الساعة ${time}.`;
  const waUrl = p.whatsappPhone
    ? buildWhatsappLink(p.whatsappPhone, waMessage)
    : null;

  if (p.lang === "en") {
    const subject = "Your booking is confirmed";
    const waButton = waUrl
      ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Contact via WhatsApp</a>`
      : "";
    const html = emailLayout(
      "en",
      `<h2 style="font-size:16px;margin:0 0 12px;">Your booking is confirmed ✅</h2>
       <p style="font-size:14px;color:#404040;margin:0 0 16px;">${escapeHtml(p.businessName)} confirmed your appointment:</p>
       <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
         ${detailRow("Service", p.serviceName)}
         ${detailRow("Provider", p.providerName)}
         ${detailRow("Date", p.date)}
         ${detailRow("Time", time)}
       </table>
       ${waButton}`,
    );
    const text = `Your booking is confirmed
${p.businessName} confirmed your appointment.
Service: ${p.serviceName}
Provider: ${p.providerName}
Date: ${p.date}
Time: ${time}${waUrl ? `\n\nContact via WhatsApp: ${waUrl}` : ""}`;
    return { subject, html, text };
  }

  const subject = "تم تأكيد حجزك";
  const waButton = waUrl
    ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">تواصل عبر واتساب</a>`
    : "";
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:16px;margin:0 0 12px;">تم تأكيد حجزك ✅</h2>
     <p style="font-size:14px;color:#404040;margin:0 0 16px;">أكّد ${escapeHtml(p.businessName)} موعدك:</p>
     <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
       ${detailRow("الخدمة", p.serviceName)}
       ${detailRow("مقدّم الخدمة", p.providerName)}
       ${detailRow("التاريخ", p.date)}
       ${detailRow("الوقت", time)}
     </table>
     ${waButton}`,
  );
  const text = `تم تأكيد حجزك
أكّد ${p.businessName} موعدك.
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ: ${p.date}
الوقت: ${time}${waUrl ? `\n\nتواصل عبر واتساب: ${waUrl}` : ""}`;
  return { subject, html, text };
}
