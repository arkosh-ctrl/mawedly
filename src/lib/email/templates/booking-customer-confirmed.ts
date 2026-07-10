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
  // Optional so existing callers/tests don't break. Same construction style
  // as review-request.ts's reviewUrl CTA.
  // Present only for virtual services: the consultation landing page + the
  // room password (guidance) to enter the meet.jit.si room.
  consultationUrl?: string;
  consultationPassword?: string;
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
    const videoBlock =
      p.consultationUrl && p.consultationPassword
        ? `<div style="margin:0 0 16px;padding:14px;border:1px solid #e5e5e5;border-radius:8px;background:#faf8f3;">
             <p style="font-size:14px;margin:0 0 10px;color:#404040;">This is an online consultation — join from your browser, no app needed:</p>
             <div style="margin-bottom:10px;"><a href="${p.consultationUrl}" style="display:inline-block;background:#006bff;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Join the video room</a></div>
             <p style="font-size:13px;margin:0;color:#404040;">Room password: <strong style="font-family:monospace;letter-spacing:2px;">${escapeHtml(p.consultationPassword)}</strong></p>
           </div>`
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
       ${videoBlock}${waButton}`,
    );
    const text = `Your booking is confirmed
${p.businessName} confirmed your appointment.
Service: ${p.serviceName}
Provider: ${p.providerName}
Date: ${p.date}
Time: ${time}${p.consultationUrl ? `\n\nJoin the video room: ${p.consultationUrl}\nRoom password: ${p.consultationPassword}` : ""}${waUrl ? `\n\nContact via WhatsApp: ${waUrl}` : ""}`;
    return { subject, html, text };
  }

  const subject = "تم تأكيد حجزك";
  const waButton = waUrl
    ? `<a href="${waUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">تواصل عبر واتساب</a>`
    : "";
  const videoBlock =
    p.consultationUrl && p.consultationPassword
      ? `<div style="margin:0 0 16px;padding:14px;border:1px solid #e5e5e5;border-radius:8px;background:#faf8f3;">
           <p style="font-size:14px;margin:0 0 10px;color:#404040;">هذه استشارة عن بُعد — ادخل من متصفحك مباشرة بلا أي تطبيق:</p>
           <div style="margin-bottom:10px;"><a href="${p.consultationUrl}" style="display:inline-block;background:#006bff;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">دخول غرفة الاستشارة</a></div>
           <p style="font-size:13px;margin:0;color:#404040;">كلمة مرور الغرفة: <strong style="font-family:monospace;letter-spacing:2px;">${escapeHtml(p.consultationPassword)}</strong></p>
         </div>`
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
     ${videoBlock}${waButton}`,
  );
  const text = `تم تأكيد حجزك
أكّد ${p.businessName} موعدك.
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ: ${p.date}
الوقت: ${time}${p.consultationUrl ? `\n\nدخول غرفة الاستشارة: ${p.consultationUrl}\nكلمة مرور الغرفة: ${p.consultationPassword}` : ""}${waUrl ? `\n\nتواصل عبر واتساب: ${waUrl}` : ""}`;
  return { subject, html, text };
}
