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
      `<h2 style="font-size:16px;margin:0 0 12px;">New booking awaiting confirmation</h2>
       <p style="font-size:14px;color:#404040;margin:0 0 16px;">A customer just booked an appointment. Review it and confirm once you've received the deposit.</p>
       <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
         ${detailRow("Customer", p.customerName)}
         ${detailRow("Service", p.serviceName)}
         ${detailRow("Provider", p.providerName)}
         ${detailRow("Date", p.date)}
         ${detailRow("Time", time)}
       </table>
       <a href="${p.appointmentsUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Open appointments</a>`,
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
    `<h2 style="font-size:16px;margin:0 0 12px;">حجز جديد بانتظار تأكيدك</h2>
     <p style="font-size:14px;color:#404040;margin:0 0 16px;">سجّل عميل موعداً جديداً. راجِعه وأكّده بعد استلام العربون.</p>
     <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
       ${detailRow("العميل", p.customerName)}
       ${detailRow("الخدمة", p.serviceName)}
       ${detailRow("مقدّم الخدمة", p.providerName)}
       ${detailRow("التاريخ", p.date)}
       ${detailRow("الوقت", time)}
     </table>
     <a href="${p.appointmentsUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">فتح الحجوزات</a>`,
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
