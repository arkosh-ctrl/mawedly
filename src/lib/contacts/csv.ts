// Minimal, dependency-free CSV parse/generate. Handles quoted fields, escaped
// quotes (""), commas and newlines inside quotes, and CRLF/LF. Good enough for
// contact import/export (no need to pull in a parser dependency).

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // End of row on \n; swallow the \n of a \r\n pair.
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Ignore fully blank lines.
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Flush trailing field/row.
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

function escapeCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// Build a CSV string with a BOM so Excel opens Arabic correctly.
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) {
    lines.push(r.map((c) => escapeCell(c == null ? "" : String(c))).join(","));
  }
  return "﻿" + lines.join("\r\n");
}
