"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  ContactRow,
  ContactMeeting,
  SentEmailRow,
  ContactList,
  CustomFieldDef,
} from "@/lib/contacts/queries";

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
  "missingNameColumn",
  "emptyFile",
  "tooManyRows",
  "importFailed",
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
  custom_fields: Record<string, string>;
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
  custom_fields: {},
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
    custom_fields: { ...c.custom_fields },
  };
}

export function ContactsClient({
  initialContacts,
  initialLists,
  customFields: initialFields,
  businessName,
}: {
  initialContacts: ContactRow[];
  initialLists: ContactList[];
  customFields: CustomFieldDef[];
  businessName: string;
}) {
  const t = useTranslations("Contacts");
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [lists, setLists] = useState<ContactList[]>(initialLists);
  const [fields, setFields] = useState<CustomFieldDef[]>(initialFields);
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [detail, setDetail] = useState<ContactRow | null>(null);
  const [emailFor, setEmailFor] = useState<ContactRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [manageFields, setManageFields] = useState(false);

  const reqId = useRef(0);

  async function refresh(s = search, fav = favOnly, list = activeList) {
    const id = ++reqId.current;
    setLoading(true);
    const qs = new URLSearchParams();
    if (s.trim()) qs.set("search", s.trim());
    if (fav) qs.set("favorite", "true");
    if (list) qs.set("list_id", list);
    try {
      const res = await fetch(`/api/contacts?${qs.toString()}`);
      const json = await res.json();
      if (id === reqId.current && res.ok) {
        setContacts(json.contacts ?? []);
        setSelected(new Set());
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => refresh(search, favOnly, activeList), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, favOnly, activeList]);

  async function reloadLists() {
    const res = await fetch("/api/contacts/lists");
    if (res.ok) setLists((await res.json()).lists ?? []);
  }
  async function reloadFields() {
    const res = await fetch("/api/contacts/fields");
    if (res.ok) setFields((await res.json()).fields ?? []);
  }

  function toggleSel(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) =>
      s.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)),
    );
  }

  function exportUrl(ids?: string[]) {
    const qs = ids && ids.length ? `?ids=${ids.join(",")}` : "";
    return `/api/contacts/export${qs}`;
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Lists sidebar */}
      <ListsSidebar
        t={t}
        lists={lists}
        active={activeList}
        favOnly={favOnly}
        onAll={() => {
          setActiveList(null);
          setFavOnly(false);
        }}
        onFav={() => {
          setActiveList(null);
          setFavOnly(true);
        }}
        onPick={(id) => {
          setActiveList(id);
          setFavOnly(false);
        }}
        onCreated={reloadLists}
        onDeleted={(id) => {
          if (activeList === id) setActiveList(null);
          reloadLists();
        }}
      />

      <div className="flex flex-1 flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-[180px] flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink hover:border-muted"
          >
            {t("import")}
          </button>
          <a
            href={exportUrl()}
            className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink hover:border-muted"
          >
            {t("export")}
          </a>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper hover:bg-primary-hover"
          >
            + {t("addContact")}
          </button>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-light px-3 py-2 text-sm">
            <span className="font-semibold text-primary">
              {t("selectedCount", { count: selected.size })}
            </span>
            <AddToListMenu
              t={t}
              lists={lists}
              onAdd={async (listId) => {
                const res = await fetch("/api/contacts/lists/members", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ listId, contactIds: [...selected] }),
                });
                if (res.ok) {
                  toast.success(t("addedToList"));
                  refresh();
                } else toast.error(t("errors.saveFailed"));
              }}
            />
            <a
              href={exportUrl([...selected])}
              className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink hover:border-muted"
            >
              {t("exportSelected")}
            </a>
            <BulkDelete t={t} ids={[...selected]} onDone={refresh} />
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted hover:text-ink"
            >
              {t("clearSelection")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
                <tr>
                  <th className="p-3 text-start">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={toggleAll}
                      aria-label={t("selectAll")}
                    />
                  </th>
                  <th className="p-3 text-start">{t("col.name")}</th>
                  <th className="p-3 text-start">{t("col.email")}</th>
                  <th className="p-3 text-start">{t("col.phone")}</th>
                  <th className="p-3 text-start">{t("col.meetings")}</th>
                  <th className="p-3 text-start">{t("col.lists")}</th>
                  <th className="p-3 text-start">{t("col.source")}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted">
                      {loading ? t("loading") : t("empty")}
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.id} className="border-t border-line hover:bg-canvas/60">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSel(c.id)}
                          aria-label={c.name}
                        />
                      </td>
                      <td className="cursor-pointer p-3 font-semibold text-ink" onClick={() => setDetail(c)}>
                        <HoverName contact={c}>
                          {c.is_favorite && <span className="text-saffron">★ </span>}
                          {c.name}
                        </HoverName>
                      </td>
                      <td className="cursor-pointer p-3 font-mono text-xs text-muted" dir="ltr" onClick={() => setDetail(c)}>
                        {c.email ?? "—"}
                      </td>
                      <td className="cursor-pointer p-3 font-mono text-xs text-muted" dir="ltr" onClick={() => setDetail(c)}>
                        {c.phone ?? "—"}
                      </td>
                      <td className="cursor-pointer p-3 text-muted" onClick={() => setDetail(c)}>
                        {c.meetingCount}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {c.lists.map((l) => (
                            <span
                              key={l.id}
                              className="rounded-full px-2 py-0.5 text-[11px] text-paper"
                              style={{ backgroundColor: l.color ?? "#3B82F6" }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
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

        <button
          type="button"
          onClick={() => setManageFields(true)}
          className="w-fit text-xs font-medium text-primary hover:text-primary-hover"
        >
          {t("manageFields")}
        </button>
      </div>

      {formOpen && (
        <ContactForm
          t={t}
          fields={fields}
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
          fields={fields}
          businessName={businessName}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail);
            setDetail(null);
            setFormOpen(true);
          }}
          onEmail={() => setEmailFor(detail)}
          onDeleted={() => {
            setDetail(null);
            refresh();
          }}
        />
      )}

      {emailFor && <EmailModal t={t} contact={emailFor} onClose={() => setEmailFor(null)} />}

      {importOpen && (
        <ImportModal
          t={t}
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false);
            refresh();
          }}
        />
      )}

      {manageFields && (
        <ManageFieldsModal
          t={t}
          fields={fields}
          onClose={() => setManageFields(false)}
          onChanged={reloadFields}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Sidebar ----- */

function ListsSidebar({
  t,
  lists,
  active,
  favOnly,
  onAll,
  onFav,
  onPick,
  onCreated,
  onDeleted,
}: {
  t: ReturnType<typeof useTranslations>;
  lists: ContactList[];
  active: string | null;
  favOnly: boolean;
  onAll: () => void;
  onFav: () => void;
  onPick: (id: string) => void;
  onCreated: () => void;
  onDeleted: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function create() {
    if (!name.trim()) return;
    start(async () => {
      const res = await fetch("/api/contacts/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName("");
        setAdding(false);
        onCreated();
      } else toast.error(t("errors.saveFailed"));
    });
  }
  function del(id: string) {
    start(async () => {
      const res = await fetch(`/api/contacts/lists/${id}`, { method: "DELETE" });
      if (res.ok) onDeleted(id);
      else toast.error(t("errors.saveFailed"));
    });
  }

  const item = "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors";
  const on = "bg-primary-light font-semibold text-primary";
  const off = "text-muted hover:bg-canvas hover:text-ink";

  return (
    <aside className="flex w-full flex-col gap-1 lg:w-56 lg:shrink-0">
      <button type="button" onClick={onAll} className={`${item} ${!active && !favOnly ? on : off}`}>
        {t("allContacts")}
      </button>
      <button type="button" onClick={onFav} className={`${item} ${favOnly ? on : off}`}>
        ★ {t("favorites")}
      </button>
      <div className="my-1 border-t border-line" />
      {lists.map((l) => (
        <div key={l.id} className={`${item} ${active === l.id ? on : off} group`}>
          <button type="button" onClick={() => onPick(l.id)} className="flex flex-1 items-center gap-2 text-start">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color ?? "#3B82F6" }} />
            {l.name}
          </button>
          <button
            type="button"
            onClick={() => del(l.id)}
            disabled={pending}
            className="opacity-0 transition-opacity hover:text-brick group-hover:opacity-100"
            aria-label={t("delete")}
          >
            ✕
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex gap-1 px-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder={t("listName")}
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button type="button" onClick={create} disabled={pending} className="rounded-lg bg-primary px-2 text-xs font-semibold text-paper">
            {t("save")}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="px-3 py-2 text-start text-sm text-primary hover:text-primary-hover">
          + {t("newList")}
        </button>
      )}
    </aside>
  );
}

function AddToListMenu({
  t,
  lists,
  onAdd,
}: {
  t: ReturnType<typeof useTranslations>;
  lists: ContactList[];
  onAdd: (listId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (lists.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink hover:border-muted"
      >
        {t("addToList")} ▾
      </button>
      {open && (
        <div className="absolute z-10 mt-1 flex min-w-[160px] flex-col rounded-lg border border-line bg-paper p-1 shadow-lg">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setOpen(false);
                onAdd(l.id);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-ink hover:bg-canvas"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color ?? "#3B82F6" }} />
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkDelete({
  t,
  ids,
  onDone,
}: {
  t: ReturnType<typeof useTranslations>;
  ids: string[];
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  function run() {
    start(async () => {
      await Promise.all(ids.map((id) => fetch(`/api/contacts/${id}`, { method: "DELETE" })));
      toast.success(t("deleted"));
      onDone();
    });
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className="rounded-full border border-brick/40 px-3 py-1 text-xs font-medium text-brick hover:bg-brick/5 disabled:opacity-60"
    >
      {t("deleteSelected")}
    </button>
  );
}

/* ------------------------------------------------------------- Hover ------ */

function HoverName({ contact, children }: { contact: ContactRow; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <span
      className="relative"
      onMouseEnter={() => {
        timer.current = setTimeout(() => setShow(true), 300);
      }}
      onMouseLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setShow(false);
      }}
    >
      {children}
      {show && (
        <span className="absolute top-full z-20 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-line bg-paper p-3 text-xs shadow-lg">
          <span className="font-semibold text-ink">{contact.name}</span>
          {contact.email && <span className="font-mono text-muted" dir="ltr">📧 {contact.email}</span>}
          {contact.phone && <span className="font-mono text-muted" dir="ltr">📱 {contact.phone}</span>}
          {(contact.job_title || contact.company) && (
            <span className="text-muted">{[contact.job_title, contact.company].filter(Boolean).join(" · ")}</span>
          )}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------- Form ------ */

function ContactForm({
  t,
  fields,
  initial,
  editingId,
  onClose,
  onSaved,
}: {
  t: ReturnType<typeof useTranslations>;
  fields: CustomFieldDef[];
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
  function setCustom(key: string, v: string) {
    setForm((f) => ({ ...f, custom_fields: { ...f.custom_fields, [key]: v } }));
  }

  function submit() {
    if (form.name.trim().length < 2) {
      toast.error(t("errors.nameRequired"));
      return;
    }
    start(async () => {
      const res = await fetch(editingId ? `/api/contacts/${editingId}` : "/api/contacts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("saved"));
        onSaved();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(errMsg(t, j.error, "saveFailed"));
      }
    });
  }

  const input = "rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";
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
        <label className={label}><span>{t("field.email")}</span>
          <input className={input} dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className={label}><span>{t("field.phone")}</span>
          <input className={input} dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className={label}><span>{t("field.jobTitle")}</span>
          <input className={input} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} /></label>
        <label className={label}><span>{t("field.company")}</span>
          <input className={input} value={form.company} onChange={(e) => set("company", e.target.value)} /></label>
        <label className={label}><span>{t("field.city")}</span>
          <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label className={label}><span>{t("field.country")}</span>
          <input className={input} value={form.country} onChange={(e) => set("country", e.target.value)} /></label>
        <label className={`${label} sm:col-span-2`}><span>{t("field.linkedin")}</span>
          <input className={input} dir="ltr" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} /></label>
        <label className={`${label} sm:col-span-2`}><span>{t("field.notes")}</span>
          <textarea className={input} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>

        {fields.map((f) => (
          <label key={f.id} className={label}>
            <span>{f.name}</span>
            <input
              className={input}
              type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
              value={form.custom_fields[f.key] ?? ""}
              onChange={(e) => setCustom(f.key, e.target.value)}
            />
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" className="size-4 accent-primary" checked={form.is_favorite} onChange={(e) => set("is_favorite", e.target.checked)} />
          <span>{t("field.favorite")}</span>
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted disabled:opacity-60">{t("cancel")}</button>
        <button type="button" onClick={submit} disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">{pending ? t("saving") : t("save")}</button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------- Detail ----- */

function ContactDetail({
  t,
  contact,
  fields,
  businessName,
  onClose,
  onEdit,
  onEmail,
  onDeleted,
}: {
  t: ReturnType<typeof useTranslations>;
  contact: ContactRow;
  fields: CustomFieldDef[];
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
    fetch(`/api/contacts/${contact.id}/meetings`).then((r) => r.json()).then((j) => setMeetings(j.meetings ?? [])).catch(() => setMeetings([]));
    fetch(`/api/contacts/${contact.id}/sent-emails`).then((r) => r.json()).then((j) => setEmails(j.emails ?? [])).catch(() => setEmails([]));
  }, [contact.id]);

  const waHref = contact.phone
    ? `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("waText", { name: contact.name, business: businessName }))}`
    : null;

  function remove() {
    start(async () => {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("deleted"));
        onDeleted();
      } else toast.error(t("errors.saveFailed"));
    });
  }

  const customEntries = fields
    .map((f) => ({ label: f.name, value: contact.custom_fields[f.key] }))
    .filter((e) => e.value);

  return (
    <Overlay onClose={onClose} side>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            {contact.is_favorite && <span className="text-saffron">★ </span>}{contact.name}
          </h2>
          {(contact.job_title || contact.company) && (
            <p className="mt-1 text-sm text-muted">{[contact.job_title, contact.company].filter(Boolean).join(" · ")}</p>
          )}
          {contact.lists.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {contact.lists.map((l) => (
                <span key={l.id} className="rounded-full px-2 py-0.5 text-[11px] text-paper" style={{ backgroundColor: l.color ?? "#3B82F6" }}>{l.name}</span>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label={t("cancel")}>✕</button>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm">
        {contact.email && <p className="font-mono text-xs text-muted" dir="ltr">📧 {contact.email}</p>}
        {contact.phone && <p className="font-mono text-xs text-muted" dir="ltr">📱 {contact.phone}</p>}
        {(contact.city || contact.country) && <p className="text-muted">🌍 {[contact.city, contact.country].filter(Boolean).join("، ")}</p>}
        {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline" dir="ltr">{contact.linkedin_url}</a>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {contact.email && <button type="button" onClick={onEmail} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-muted">📧 {t("sendEmail")}</button>}
        {waHref && <a href={waHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-pine/40 px-3 py-1.5 text-xs font-medium text-pine hover:bg-pine/5">{t("whatsapp")}</a>}
        <button type="button" onClick={onEdit} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-muted">✏️ {t("edit")}</button>
      </div>

      <section className="mt-6">
        <h3 className="eyebrow">{t("meetingsHistory")}</h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {meetings === null ? <p className="text-xs text-muted">{t("loading")}</p>
            : meetings.length === 0 ? <p className="text-xs text-muted">{t("noMeetings")}</p>
            : meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                  <span className="font-mono text-muted" dir="ltr">{m.date} · {m.start_time}</span>
                  <span className="text-ink">{m.service ?? "—"}</span>
                  <span className="text-muted">{t(`status.${m.status}`)}</span>
                </div>
              ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="eyebrow">{t("emailsHistory")}</h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {emails === null ? <p className="text-xs text-muted">{t("loading")}</p>
            : emails.length === 0 ? <p className="text-xs text-muted">{t("noEmails")}</p>
            : emails.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                  <span className="text-ink">{e.subject}</span>
                  <span className="font-mono text-muted" dir="ltr">{e.sent_at?.slice(0, 10) ?? ""}</span>
                </div>
              ))}
        </div>
      </section>

      {customEntries.length > 0 && (
        <section className="mt-5">
          <h3 className="eyebrow">{t("customFields")}</h3>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {customEntries.map((e) => (
              <div key={e.label} className="flex justify-between gap-2"><span className="text-muted">{e.label}</span><span className="text-ink">{e.value}</span></div>
            ))}
          </div>
        </section>
      )}

      {contact.notes && (
        <section className="mt-5">
          <h3 className="eyebrow">{t("field.notes")}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{contact.notes}</p>
        </section>
      )}

      <div className="mt-6 border-t border-line pt-4">
        {!confirmDel ? (
          <button type="button" onClick={() => setConfirmDel(true)} className="text-xs font-medium text-brick hover:underline">🗑️ {t("delete")}</button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-brick">{t("confirmDelete")}</span>
            <button type="button" onClick={remove} disabled={pending} className="rounded-full bg-brick px-3 py-1 text-xs font-semibold text-paper disabled:opacity-60">{pending ? t("deleting") : t("confirmYes")}</button>
            <button type="button" onClick={() => setConfirmDel(false)} disabled={pending} className="rounded-full border border-line px-3 py-1 text-xs text-ink">{t("cancel")}</button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

/* --------------------------------------------------------------- Email ---- */

type EmailTemplate = { id: string; name: string; subject: string; body: string };

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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [tplName, setTplName] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch("/api/contacts/templates")
      .then((r) => r.json())
      .then((j) => setTemplates(j.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  // Fill from a template, substituting {name} with the contact's name.
  function applyTemplate(id: string) {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    const sub = (s: string) => s.replaceAll("{name}", contact.name);
    setSubject(sub(tpl.subject));
    setBody(sub(tpl.body));
  }

  function saveTemplate() {
    if (!tplName.trim() || !subject.trim() || !body.trim()) {
      toast.error(t("errors.validationFailed"));
      return;
    }
    start(async () => {
      const res = await fetch("/api/contacts/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tplName.trim(), subject, body }),
      });
      if (res.ok) {
        toast.success(t("templateSaved"));
        setTplName("");
        setSaving(false);
        const j = await (await fetch("/api/contacts/templates")).json();
        setTemplates(j.templates ?? []);
      } else toast.error(t("errors.saveFailed"));
    });
  }

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
  const input = "rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-lg font-bold text-ink">{t("emailTo", { name: contact.name })}</h2>
      <p className="mt-1 font-mono text-xs text-muted" dir="ltr">{contact.email}</p>

      {/* Template picker + save */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {templates.length > 0 && (
          <select
            className={`${input} text-xs`}
            defaultValue=""
            onChange={(e) => e.target.value && applyTemplate(e.target.value)}
          >
            <option value="">{t("chooseTemplate")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
        )}
        {!saving ? (
          <button type="button" onClick={() => setSaving(true)} className="rounded-full border border-line px-3 py-1 text-xs text-ink hover:border-muted">
            {t("saveTemplate")}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input className={`${input} text-xs`} placeholder={t("templateName")} value={tplName} onChange={(e) => setTplName(e.target.value)} />
            <button type="button" onClick={saveTemplate} disabled={pending} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-paper">{t("save")}</button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <input className={input} placeholder={t("emailSubject")} maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className={input} rows={8} placeholder={t("emailBody")} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="text-xs text-muted">{t("templateHint")}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted disabled:opacity-60">{t("cancel")}</button>
        <button type="button" onClick={send} disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">{pending ? t("sending") : t("send")}</button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------------------- Import ---- */

function ImportModal({
  t,
  onClose,
  onDone,
}: {
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [strategy, setStrategy] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null);
  const [pending, start] = useTransition();

  function onFile(f: File | null) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error(t("errors.tooManyRows"));
      return;
    }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function run() {
    if (!csv) return;
    start(async () => {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, strategy }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setResult(j);
      else toast.error(errMsg(t, j.error, "importFailed"));
    });
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-lg font-bold text-ink">{t("importTitle")}</h2>
      {result ? (
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <p className="text-pine">{t("importResult", { imported: result.imported, updated: result.updated, skipped: result.skipped })}</p>
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-brick/30 bg-brick/5 p-3 text-xs text-brick">
              {result.errors.slice(0, 20).map((e) => (
                <div key={e.row}>{t("importRowError", { row: e.row, reason: t(`errors.${e.reason === "name" ? "nameRequired" : "email"}`) })}</div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={onDone} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover">{t("done")}</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t("importHint")}</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="mt-4 text-sm" />
          {fileName && <p className="mt-1 text-xs text-muted" dir="ltr">{fileName}</p>}
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <span className="font-medium text-ink">{t("duplicates")}</span>
            <label className="flex items-center gap-2"><input type="radio" checked={strategy === "skip"} onChange={() => setStrategy("skip")} className="accent-primary" /> {t("dupSkip")}</label>
            <label className="flex items-center gap-2"><input type="radio" checked={strategy === "update"} onChange={() => setStrategy("update")} className="accent-primary" /> {t("dupUpdate")}</label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted">{t("cancel")}</button>
            <button type="button" onClick={run} disabled={!csv || pending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">{pending ? t("importing") : t("importRun")}</button>
          </div>
        </>
      )}
    </Overlay>
  );
}

/* --------------------------------------------------------- Manage fields -- */

function ManageFieldsModal({
  t,
  fields,
  onClose,
  onChanged,
}: {
  t: ReturnType<typeof useTranslations>;
  fields: CustomFieldDef[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    start(async () => {
      const res = await fetch("/api/contacts/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      if (res.ok) {
        setName("");
        onChanged();
      } else toast.error(t("errors.saveFailed"));
    });
  }
  function del(id: string) {
    start(async () => {
      const res = await fetch(`/api/contacts/fields/${id}`, { method: "DELETE" });
      if (res.ok) onChanged();
      else toast.error(t("errors.saveFailed"));
    });
  }
  const input = "rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-display text-lg font-bold text-ink">{t("manageFields")}</h2>
      <div className="mt-4 flex flex-col gap-2">
        {fields.length === 0 && <p className="text-sm text-muted">{t("noFields")}</p>}
        {fields.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
            <span className="text-ink">{f.name} <span className="text-xs text-muted">({t(`fieldType.${f.type}`)})</span></span>
            <button type="button" onClick={() => del(f.id)} disabled={pending} className="text-brick hover:underline">{t("delete")}</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input className={`${input} flex-1`} placeholder={t("fieldName")} value={name} onChange={(e) => setName(e.target.value)} />
        <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="text">{t("fieldType.text")}</option>
          <option value="number">{t("fieldType.number")}</option>
          <option value="date">{t("fieldType.date")}</option>
        </select>
        <button type="button" onClick={add} disabled={pending} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper hover:bg-primary-hover disabled:opacity-60">{t("addField")}</button>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-muted">{t("done")}</button>
      </div>
    </Overlay>
  );
}

/* -------------------------------------------------------------- Overlay --- */

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
    <div className="fixed inset-0 z-50 flex bg-ink/30 p-4" onClick={onClose} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className={side ? "ms-auto h-full w-full max-w-md overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl" : "m-auto w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl"}
      >
        {children}
      </div>
    </div>
  );
}
