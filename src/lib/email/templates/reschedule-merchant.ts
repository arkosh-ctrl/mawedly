import { emailLayout, detailRow, type EmailLang } from "./layout";

// "Appointment rescheduled" confirmation for the merchant, sent after they move
// a confirmed appointment. Language follows businesses.default_language.
export function rescheduleMerchantEmail(p: {
  lang: EmailLang;
  customerName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  appointmentsUrl: string;
}): { subject: string; html: string; text: string } {
  const time = p.time.slice(0, 5);

  if (p.lang === "en") {
    const subject = "Appointment rescheduled";
    const html = emailLayout(
      "en",
      `<h2 style="font-size:17px;margin:0 0 8px;color:#111827;">Appointment rescheduled</h2>
       <p style="font-size:14px;color:#4b5563;margin:0 0 18px;">You moved this confirmed appointment to a new time. The deposit is unchanged.</p>
       <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:6px 16px;margin-bottom:22px;">
         <table style="border-collapse:collapse;width:100%;">
           ${detailRow("Customer", p.customerName)}
           ${detailRow("Service", p.serviceName)}
           ${detailRow("Provider", p.providerName)}
           ${detailRow("New date", p.date)}
           ${detailRow("New time", time)}
         </table>
       </div>
       <a href="${p.appointmentsUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 24px;border-radius:9999px;">Open appointments</a>`,
    );
    const text = `Appointment rescheduled
Customer: ${p.customerName}
Service: ${p.serviceName}
Provider: ${p.providerName}
New date: ${p.date}
New time: ${time}

Open appointments: ${p.appointmentsUrl}`;
    return { subject, html, text };
  }

  const subject = "تم تعديل موعد";
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:17px;margin:0 0 8px;color:#111827;">تم تعديل موعد</h2>
     <p style="font-size:14px;color:#4b5563;margin:0 0 18px;">عدّلت هذا الموعد المؤكد إلى وقت جديد. العربون لم يتغيّر.</p>
     <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:6px 16px;margin-bottom:22px;">
       <table style="border-collapse:collapse;width:100%;">
         ${detailRow("العميل", p.customerName)}
         ${detailRow("الخدمة", p.serviceName)}
         ${detailRow("مقدّم الخدمة", p.providerName)}
         ${detailRow("التاريخ الجديد", p.date)}
         ${detailRow("الوقت الجديد", time)}
       </table>
     </div>
     <a href="${p.appointmentsUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 24px;border-radius:9999px;">فتح الحجوزات</a>`,
  );
  const text = `تم تعديل موعد
العميل: ${p.customerName}
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ الجديد: ${p.date}
الوقت الجديد: ${time}

فتح الحجوزات: ${p.appointmentsUrl}`;
  return { subject, html, text };
}
