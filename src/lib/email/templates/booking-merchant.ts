import { emailLayout, detailRow, type EmailLang } from "./layout";

// "New booking awaiting confirmation" email for the merchant. Language follows
// the merchant's businesses.default_language.
export function bookingMerchantEmail(p: {
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
    const subject = "New booking awaiting confirmation";
    const html = emailLayout(
      "en",
      `<h2 style="font-size:17px;margin:0 0 8px;color:#111827;">New booking awaiting confirmation</h2>
       <p style="font-size:14px;color:#4b5563;margin:0 0 18px;">A customer just booked an appointment. Review it and confirm once you've received the deposit.</p>
       <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:6px 16px;margin-bottom:22px;">
         <table style="border-collapse:collapse;width:100%;">
           ${detailRow("Customer", p.customerName)}
           ${detailRow("Service", p.serviceName)}
           ${detailRow("Provider", p.providerName)}
           ${detailRow("Date", p.date)}
           ${detailRow("Time", time)}
         </table>
       </div>
       <a href="${p.appointmentsUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 24px;border-radius:9999px;">Open appointments</a>`,
    );
    const text = `New booking awaiting confirmation
Customer: ${p.customerName}
Service: ${p.serviceName}
Provider: ${p.providerName}
Date: ${p.date}
Time: ${time}

Open appointments: ${p.appointmentsUrl}`;
    return { subject, html, text };
  }

  const subject = "حجز جديد بانتظار تأكيدك";
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:17px;margin:0 0 8px;color:#111827;">حجز جديد بانتظار تأكيدك</h2>
     <p style="font-size:14px;color:#4b5563;margin:0 0 18px;">سجّل عميل موعداً جديداً. راجِعه وأكّده بعد استلام العربون.</p>
     <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:6px 16px;margin-bottom:22px;">
       <table style="border-collapse:collapse;width:100%;">
         ${detailRow("العميل", p.customerName)}
         ${detailRow("الخدمة", p.serviceName)}
         ${detailRow("مقدّم الخدمة", p.providerName)}
         ${detailRow("التاريخ", p.date)}
         ${detailRow("الوقت", time)}
       </table>
     </div>
     <a href="${p.appointmentsUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 24px;border-radius:9999px;">فتح الحجوزات</a>`,
  );
  const text = `حجز جديد بانتظار تأكيدك
العميل: ${p.customerName}
الخدمة: ${p.serviceName}
مقدّم الخدمة: ${p.providerName}
التاريخ: ${p.date}
الوقت: ${time}

فتح الحجوزات: ${p.appointmentsUrl}`;
  return { subject, html, text };
}
