import { emailLayout, escapeHtml, type EmailLang } from "./layout";

// Post-appointment "rate your visit" email for the customer. Sent once, only
// when an appointment becomes 'completed' and only if the customer left an
// email. Deliberately carries NO appointment details — just the business name
// and a CTA to the public review page (mirrors the review page's minimal
// surface). Same construction style as booking-customer-confirmed.ts.
export function reviewRequestEmail(p: {
  lang: EmailLang;
  businessName: string;
  reviewUrl: string;
}): { subject: string; html: string; text: string } {
  if (p.lang === "en") {
    const subject = "How was your visit?";
    const cta = `<a href="${p.reviewUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">Rate your visit</a>`;
    const html = emailLayout(
      "en",
      `<h2 style="font-size:16px;margin:0 0 12px;">How was your visit? ⭐</h2>
       <p style="font-size:14px;color:#404040;margin:0 0 20px;">Thanks for visiting ${escapeHtml(p.businessName)}. We'd love a quick rating — it only takes a moment.</p>
       ${cta}`,
    );
    const text = `How was your visit?
Thanks for visiting ${p.businessName}. We'd love a quick rating — it only takes a moment.

Rate your visit: ${p.reviewUrl}`;
    return { subject, html, text };
  }

  const subject = "كيف كانت زيارتك؟";
  const cta = `<a href="${p.reviewUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:8px;">قيّم زيارتك</a>`;
  const html = emailLayout(
    "ar",
    `<h2 style="font-size:16px;margin:0 0 12px;">كيف كانت زيارتك؟ ⭐</h2>
     <p style="font-size:14px;color:#404040;margin:0 0 20px;">شكراً لزيارتك ${escapeHtml(p.businessName)}. يسعدنا تقييم سريع منك — لا يستغرق سوى لحظات.</p>
     ${cta}`,
  );
  const text = `كيف كانت زيارتك؟
شكراً لزيارتك ${p.businessName}. يسعدنا تقييم سريع منك — لا يستغرق سوى لحظات.

قيّم زيارتك: ${p.reviewUrl}`;
  return { subject, html, text };
}
