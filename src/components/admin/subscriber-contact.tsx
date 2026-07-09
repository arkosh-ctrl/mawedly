"use client";

import { buildWhatsappLink } from "@/lib/whatsapp";
import type { SubscriberStatus } from "@/lib/admin/queries";

// Pre-filled outreach copy. Renewal-focused for churned/expired subscribers.
function promoMessage(name: string, status: SubscriberStatus): string {
  const renewal = status === "suspended" || status === "trial_expired";
  if (renewal) {
    return `مرحباً ${name} 👋 من فريق موعدلي.\nلاحظنا توقّف اشتراكك، ونودّ مساعدتك على العودة لاستقبال حجوزاتك بسهولة. لديك عرض خاص لتجديد الخدمة — نسعد بخدمتك!`;
  }
  return `مرحباً ${name} 👋 من فريق موعدلي.\nنشكر اشتراكك معنا، ونحب نطمئن على تجربتك ونساعدك في تحقيق أقصى استفادة من المنصة.`;
}

export function SubscriberContact({
  name,
  phone,
  email,
  status,
}: {
  name: string;
  phone: string;
  email: string | null;
  status: SubscriberStatus;
}) {
  const message = promoMessage(name, status);
  const waUrl = buildWhatsappLink(phone, message);
  const mailUrl = email
    ? `mailto:${email}?subject=${encodeURIComponent("موعدلي — عرض خاص لك")}&body=${encodeURIComponent(message)}`
    : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-pine/40 px-2.5 py-1 text-xs font-medium text-pine transition-colors hover:bg-pine/5"
        >
          واتساب
        </a>
      )}
      {mailUrl && (
        <a
          href={mailUrl}
          className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-ink"
        >
          إيميل
        </a>
      )}
      {!waUrl && !mailUrl && <span className="text-xs text-muted">—</span>}
    </div>
  );
}
