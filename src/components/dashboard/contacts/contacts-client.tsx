"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  ContactRow,
  ContactMeeting,
  SentEmailRow,
} from "@/lib/contacts/queries";

// Map a server error code to a known translation key; fall back to a generic.
const KNOWN_ERRORS = new Set([
  "duplicate",
  "rateLimitHour",
  "rateLimitContact",
  "noEmail",
  "notFound",
  "unauthorized",
  "validationFailed",
  "saveFailed",
  "sendFailed",
]);
function errMsg(
  t: ReturnType<typeof useTranslations>,
  code: unknown,
  fallback: string,
): string {
  const key = typeof code === "string" && KNOWN_ERRORS.has(code) ? code : fallback;
  return t(`errors.${key}`);
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  company: string;
  linkedin_url: string;
  timezone: string;
  country: string;
  city: string;
  notes: string;
  is_favorite: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  job_title: "",
  company: "",
  linkedin_url: "",
  timezone: "",
  country: "",
  city: "",
  notes: "",
  is_favorite: false,
};

function toForm(c: ContactRow): FormState {
  return {
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    job_title: c.job_title ?? "",
    company: c.company ?? "",
    linkedin_url: c.linkedin_url ?? "",
    timezone: c.timezone ?? "",
    country: c.country ?? "",
    city: c.city ?? "",
    notes: c.notes ?? "",
    is_favorite: c.is_favorite,
  };
}

export function ContactsClient({
  initialContacts,
  businessName,
}: {
  initialContacts: ContactRow[];
  businessName: string;
}) {
  const t = useTranslations("Contacts");
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [detail, setDetail] = useState<ContactRow | null>(null);
  const [emailFor, setEmailFor] = useState<ContactRow | null>(null);

  const reqId = useRef(0);

  async function refresh(nextSearch = search, nextFav = favOnly) {
    const id = ++reqId.current;
    setLoading(true);
    const qs = new URLSearchParams();
    if (nextSearch.trim()) qs.set("search", nextSearch.trim());
    if (nextFav) qs.set("favorite", "true");
    try {
      const res = await fetch(`/api/contacts?${qs.toString()}`);
      const json = await res.json();
      if (id === reqId.current && res.ok) setContacts(json.contacts ?? []);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  // Debounced search + favorite filter.
  useEffect(() => {
    const timer = setTimeout(() => refresh(search, favOnly), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, favOnly]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
            favOnly ? "border-saffron bg-saffron/10 text-ink" : "border-line text-muted hover:border-muted"
          }`}
        >
          ★ {t("favorites")}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
        >
          + {t("addContact")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
              <tr>
                <th className="p-3 text-start">{t("col.name")}</th>
                <th className="p-3 text-start">{t("col.email")}</th>
                <th className="p-3 text-start">{t("col.phone")}</th>
                <th className="p-3 text-start">{t("col.meetings")}</th>
                <th className="p-3 text-start">{t("col.lastMeeting")}</th>
                <th className="p-3 text-start">{t("col.source")}</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted">
                    {loading ? t("loading") : t("empty")}
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setDetail(c)}
                    className="cursor-pointer border-t border-line hover:bg-canvas/60"
                  >
                    <td className="p-3 font-semibold text-ink">
                      {c.is_favorite && <span className="text-saffron">★ </span>}
                      {c.name}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {c.email ?? "—"}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {c.phone ?? "—"}
                    </td>
                    <td className="p-3 text-muted">{c.meetingCount}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {c.lastMeeting ?? "—"}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
                        {t(`sourceLabel.${c.source}`)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <ContactForm
          t={t}
          initial={editing ? toForm(editing) : EMPTY_FORM}
          editingId={editing?.id ?? null}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            refresh();
          }}
        />
      )}

      {detail && (
        <ContactDetail
          t={t}
          contact={detail}
          businessName={businessName}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail);
            setDetail(null);
            setFormOpen(true);
          }}
          onEmail={() => {
            setEmailFor(detail);
          }}
          onDeleted={() => {
            setDetail(null);
            refresh();
          }}
        />
      )}

      {emailFor && (
        <EmailModal
          t={t}
          contact={emailFor}
          onClose={() => setEmailFor(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Form ----- */

function ContactForm({
  t,
  initial,
  editingId,
  onClose,
  onSaved,
}: {
  t: ReturnType<typeof useTranslations>;
  initial: FormState;
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [pending, start] = useTransition();

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (form.name.trim().length < 2) {
      toast.error(t("errors.nameRequired"));
      return;
    }
    start(async () => {
      const res = await fetch(
        editingId ? `/api/contacts/${editingId}` : "/api/contacts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (res.ok) {
        toast.success(t("saved"));
        onSaved();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(errMsg(t, j.error, "saveFailed"));
      }
    });
  }

  const input =
    "rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";
  const label = "flex flex-col gap-1 text-sm font-medium text-ink";

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-lg font-bold text-ink">
        {editingId ? t("editContact") : t("addContact")}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          <span>{t("field.name")} *</span>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.email")}</span>
          <input className={input} dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.phone")}</span>
          <input className={input} dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.jobTitle")}</span>
          <input className={input} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.company")}</span>
          <input className={input} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.city")}</span>
          <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </label>
        <label className={label}>
          <span>{t("field.country")}</span>
          <input className={input} value={form.country} onChange={(e) => set("country", e.target.value)} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span>{t("field.linkedin")}</span>
          <input className={input} dir="ltr" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span>{t("field.notes")}</span>
          <textarea className={input} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" className="size-4 accent-primary" checked={form.is_favorite} onChange={(e) => set("is_favorite", e.target.checked)} />
          <span>{t("field.favorite")}</span>
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted disabled:opacity-60">
          {t("cancel")}
        </button>
        <button type="button" onClick={submit} disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------------------- Detail ----- */

function ContactDetail({
  t,
  contact,
  businessName,
  onClose,
  onEdit,
  onEmail,
  onDeleted,
}: {
  t: ReturnType<typeof useTranslations>;
  contact: ContactRow;
  businessName: string;
  onClose: () => void;
  onEdit: () => void;
  onEmail: () => void;
  onDeleted: () => void;
}) {
  const [meetings, setMeetings] = useState<ContactMeeting[] | null>(null);
  const [emails, setEmails] = useState<SentEmailRow[] | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch(`/api/contacts/${contact.id}/meetings`)
      .then((r) => r.json())
      .then((j) => setMeetings(j.meetings ?? []))
      .catch(() => setMeetings([]));
    fetch(`/api/contacts/${contact.id}/sent-emails`)
      .then((r) => r.json())
      .then((j) => setEmails(j.emails ?? []))
      .catch(() => setEmails([]));
  }, [contact.id]);

  const waHref = contact.phone
    ? `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        t("waText", { name: contact.name, business: businessName }),
      )}`
    : null;

  function remove() {
    start(async () => {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("deleted"));
        onDeleted();
      } else {
        toast.error(t("errors.saveFailed"));
      }
    });
  }

  return (
    <Overlay onClose={onClose} side>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            {contact.is_favorite && <span className="text-saffron">★ </span>}
            {contact.name}
          </h2>
          {(contact.job_title || contact.company) && (
            <p className="mt-1 text-sm text-muted">
              {[contact.job_title, contact.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label={t("cancel")}>
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm">
        {contact.email && <p className="font-mono text-xs text-muted" dir="ltr">📧 {contact.email}</p>}
        {contact.phone && <p className="font-mono text-xs text-muted" dir="ltr">📱 {contact.phone}</p>}
        {(contact.city || contact.country) && (
          <p className="text-muted">🌍 {[contact.city, contact.country].filter(Boolean).join("، ")}</p>
        )}
        {contact.linkedin_url && (
          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline" dir="ltr">
            {contact.linkedin_url}
          </a>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {contact.email && (
          <button type="button" onClick={onEmail} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-muted">
            📧 {t("sendEmail")}
          </button>
        )}
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-pine/40 px-3 py-1.5 text-xs font-medium text-pine hover:bg-pine/5">
            {t("whatsapp")}
          </a>
        )}
        <button type="button" onClick={onEdit} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-muted">
          ✏️ {t("edit")}
        </button>
      </div>

      {/* Meetings */}
      <section className="mt-6">
        <h3 className="eyebrow">{t("meetingsHistory")}</h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {meetings === null ? (
            <p className="text-xs text-muted">{t("loading")}</p>
          ) : meetings.length === 0 ? (
            <p className="text-xs text-muted">{t("noMeetings")}</p>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                <span className="font-mono text-muted" dir="ltr">{m.date} · {m.start_time}</span>
                <span className="text-ink">{m.service ?? "—"}</span>
                <span className="text-muted">{t(`status.${m.status}`)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sent emails */}
      <section className="mt-5">
        <h3 className="eyebrow">{t("emailsHistory")}</h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {emails === null ? (
            <p className="text-xs text-muted">{t("loading")}</p>
          ) : emails.length === 0 ? (
            <p className="text-xs text-muted">{t("noEmails")}</p>
          ) : (
            emails.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                <span className="text-ink">{e.subject}</span>
                <span className="font-mono text-muted" dir="ltr">{e.sent_at?.slice(0, 10) ?? ""}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {contact.notes && (
        <section className="mt-5">
          <h3 className="eyebrow">{t("field.notes")}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{contact.notes}</p>
        </section>
      )}

      <div className="mt-6 border-t border-line pt-4">
        {!confirmDel ? (
          <button type="button" onClick={() => setConfirmDel(true)} className="text-xs font-medium text-brick hover:underline">
            🗑️ {t("delete")}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-brick">{t("confirmDelete")}</span>
            <button type="button" onClick={remove} disabled={pending} className="rounded-full bg-brick px-3 py-1 text-xs font-semibold text-paper disabled:opacity-60">
              {pending ? t("deleting") : t("confirmYes")}
            </button>
            <button type="button" onClick={() => setConfirmDel(false)} disabled={pending} className="rounded-full border border-line px-3 py-1 text-xs text-ink">
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

/* --------------------------------------------------------------- Email ----- */

function EmailModal({
  t,
  contact,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>;
  contact: ContactRow;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function send() {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("errors.subjectRequired"));
      return;
    }
    start(async () => {
      const res = await fetch(`/api/contacts/${contact.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (res.ok) {
        toast.success(t("emailSent"));
        onClose();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(errMsg(t, j.error, "sendFailed"));
      }
    });
  }

  const input =
    "rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-lg font-bold text-ink">
        {t("emailTo", { name: contact.name })}
      </h2>
      <p className="mt-1 font-mono text-xs text-muted" dir="ltr">{contact.email}</p>
      <div className="mt-4 flex flex-col gap-3">
        <input
          className={input}
          placeholder={t("emailSubject")}
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className={input}
          rows={8}
          placeholder={t("emailBody")}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted disabled:opacity-60">
          {t("cancel")}
        </button>
        <button type="button" onClick={send} disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------------------- Overlay ---- */

function Overlay({
  children,
  onClose,
  side,
}: {
  children: React.ReactNode;
  onClose: () => void;
  side?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className={
          side
            ? "ms-auto h-full w-full max-w-md overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl"
            : "m-auto w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl"
        }
      >
        {children}
      </div>
    </div>
  );
}
