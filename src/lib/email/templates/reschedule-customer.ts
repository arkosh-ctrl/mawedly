import { buildWhatsappLink } from "@/lib/whatsapp";
import { emailLayout, detailRow, escapeHtml, type EmailLang } from "./layout";

// "Appointment rescheduled" email for the customer. The deposit is untouched —
// only the date/time changed. Includes a wa.me link to the merchant, built with
// the same helper used elsewhere. Sent only when the customer left an email.
export function rescheduleCustomerEmail(p: {
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
      ? `Hello, regarding my rescheduled ${p.serviceName} appointment on ${p.date} at ${time}.`
      : `السلام عليكم، بخصوص موعدي المُعدّل (${p.serviceName}) يوم ${p.date} الساعة ${time}.`;
  const waUrl = p.whatsappPhone
    ? buildWhatsappLink(p.whatsappPhone, waMessage)
    : null;

  if (p.lang === "en") {
    const subject = "Your appointment was rescheduled";
    const waButton = waUrl
      ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Contact via WhatsApp</a>`
      : "";
    const html = emailLayout(
      "en",
      `<h2 style="font-size:16px;margin:0 0 12px;">Your appointment was rescheduled 🗓️</h2>
       <p style="font-size:14px;color:#404040;margin:0 0 16px;">${escapeHtml(p.businessName)} moved your appointment to a new time. Your deposit stays as is.</p>
       <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
         ${detailRow("Service", p.serviceName)}
         ${detailRow("Provider", p.providerName)}
         ${detailRow("New date", p.date)}
         ${detailRow("New time", time)}
       </table>
       ${waButton}`,
    );
    const text = `Your appointment was rescheduled
${p.businessName} moved your appointment to a new time. Your deposit stays as is.
Service: ${p.serviceName}
Provider: ${p.providerName}
New date: ${p.date}
New time: ${time}${waUrl ? `\n\nContact via WhatsApp: ${waUrl}` : ""}`;
    return { subject, html, text };
  }

  const subject = "تم تعديل موعد حجزك";
  const waButton = waUrl
    ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">تواصل عبر واتساب</a>`
    : "";
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:16px;margin:0 0 12px;">تم تعديل موعد حجزك 🗓️</h2>
     <p style="font-size:14px;color:#404040;margin:0 0 16px;">عدّل ${escapeHtml(p.businessName)} موعدك إلى وقت جديد. عربونك محفوظ كما هو.</p>
     <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
       ${detailRow("الخدمة", p.serviceName)}
       ${detailRow("مقدّم الخدمة", p.providerName)}
       ${detailRow("التاريخ الجديد", p.date)}
       ${detailRow("الوقت الجديد", time)}
     </table>
     ${waButton}`,
  );
  const text = `تم تعديل موعد حجزك
عدّل ${p.businessName} موعدك إلى وقت جديد. عربونك محفوظ كما هو.
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ الجديد: ${p.date}
الوقت الجديد: ${time}${waUrl ? `\n\nتواصل عبر واتساب: ${waUrl}` : ""}`;
  return { subject, html, text };
}
