// Shared HTML email shell + escaping. Dynamic, user-entered values (customer
// name, business name, service) MUST be passed through escapeHtml to avoid HTML
// injection in the rendered email.

export type EmailLang = "ar" | "en";

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

export function emailLayout(lang: EmailLang, innerHtml: string): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const footerText = lang === "ar" ? "أُرسلت عبر موعدلي" : "Sent via Mawedly";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <body style="margin:0;background:#f3f4f6;font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;color:#0a0a0a;">
    <div style="max-width:520px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:22px 24px;">
        <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:.2px;">Mawedly · موعدلي</div>
      </div>
      <div style="padding:24px;">
        ${innerHtml}
      </div>
      <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 24px;font-size:12px;color:#9ca3af;">${footerText}</div>
    </div>
  </body>
</html>`;
}

// A simple label/value row used by both templates.
export function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#737373;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:6px 12px;font-size:14px;">${escapeHtml(value)}</td>
  </tr>`;
}
