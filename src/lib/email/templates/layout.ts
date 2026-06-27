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
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <body style="margin:0;background:#f5f5f5;font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;color:#0a0a0a;">
    <div style="max-width:520px;margin:24px auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:16px;">Mawedly · موعدلي</div>
      ${innerHtml}
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
