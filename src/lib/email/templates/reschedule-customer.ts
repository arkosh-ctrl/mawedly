import { buildWhatsappLink } from "@/lib/whatsapp";
import { emailLayout, detailRow, escapeHtml, type EmailLang } from "./layout";

// "Appointment rescheduled" email for the customer — sent after the merchant
// moves a confirmed appointment to a new time, and only if the customer left an
// email. Mirrors booking-customer-confirmed.ts: shows the NEW date/time and
// keeps the wa.me CTA to the merchant.
export function rescheduleCustomerEmail(p: {
  lang: EmailLang;
  businessName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  whatsappPhone: string | null;
  // Optional so existing callers/tests don't break. Same construction style
  // as review-request.ts's reviewUrl CTA.
  chatUrl?: string;
}): { subject: string; html: string; text: string } {
  const time = p.time.slice(0, 5);

  const waMessage =
    p.lang === "en"
      ? `Hello, regarding my rescheduled ${p.serviceName} appointment on ${p.date} at ${time}.`
      : `السلام عليكم، بخصوص موعدي المُعاد جدولته (${p.serviceName}) يوم ${p.date} الساعة ${time}.`;
  const waUrl = p.whatsappPhone
    ? buildWhatsappLink(p.whatsappPhone, waMessage)
    : null;

  if (p.lang === "en") {
    const subject = "Your appointment was rescheduled";
    const chatButton = p.chatUrl
      ? `<div style="margin-bottom:10px;"><a href="${p.chatUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Chat with your provider</a></div>`
      : "";
    const waButton = waUrl
      ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Contact via WhatsApp</a>`
      : "";
    const html = emailLayout(
      "en",
      `<h2 style="font-size:16px;margin:0 0 12px;">Your appointment was rescheduled 🗓️</h2>
       <p style="font-size:14px;color:#404040;margin:0 0 16px;">${escapeHtml(p.businessName)} moved your appointment to a new time:</p>
       <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
         ${detailRow("Service", p.serviceName)}
         ${detailRow("Provider", p.providerName)}
         ${detailRow("New date", p.date)}
         ${detailRow("New time", time)}
       </table>
       ${chatButton}${waButton}`,
    );
    const text = `Your appointment was rescheduled
${p.businessName} moved your appointment to a new time.
Service: ${p.serviceName}
Provider: ${p.providerName}
New date: ${p.date}
New time: ${time}${p.chatUrl ? `\n\nChat with your provider: ${p.chatUrl}` : ""}${waUrl ? `\n\nContact via WhatsApp: ${waUrl}` : ""}`;
    return { subject, html, text };
  }

  const subject = "تم تغيير موعد حجزك";
  const chatButton = p.chatUrl
    ? `<div style="margin-bottom:10px;"><a href="${p.chatUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">تواصل مع مزود الخدمة عبر المحادثة</a></div>`
    : "";
  const waButton = waUrl
    ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">تواصل عبر واتساب</a>`
    : "";
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:16px;margin:0 0 12px;">تم تغيير موعد حجزك 🗓️</h2>
     <p style="font-size:14px;color:#404040;margin:0 0 16px;">غيّر ${escapeHtml(p.businessName)} موعدك إلى وقت جديد:</p>
     <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
       ${detailRow("الخدمة", p.serviceName)}
       ${detailRow("مقدّم الخدمة", p.providerName)}
       ${detailRow("التاريخ الجديد", p.date)}
       ${detailRow("الوقت الجديد", time)}
     </table>
     ${chatButton}${waButton}`,
  );
  const text = `تم تغيير موعد حجزك
غيّر ${p.businessName} موعدك إلى وقت جديد.
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ الجديد: ${p.date}
الوقت الجديد: ${time}${p.chatUrl ? `\n\nتواصل مع مزود الخدمة عبر المحادثة: ${p.chatUrl}` : ""}${waUrl ? `\n\nتواصل عبر واتساب: ${waUrl}` : ""}`;
  return { subject, html, text };
}
