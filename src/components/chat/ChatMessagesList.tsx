"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getChatAttachmentUrl } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/types";

// Scrollable message list: fixed-side bubbles, a date separator between
// different days, and auto-scroll to the newest message.
//
// Bubble sides are FIXED by product decision: business always on the right,
// customer always on the left — in BOTH RTL and LTR. Logical alignment
// (self-start/self-end) cannot express a fixed side because it mirrors with
// the locale, so this is a deliberate, documented exception to the
// logical-properties rule: physical auto cross-margins (ml-auto = hug right,
// mr-auto = hug left) pin each bubble to its side in every direction.
export function ChatMessagesList({
  messages,
  isTyping,
}: {
  messages: ChatMessage[];
  isTyping?: boolean;
}) {
  const t = useTranslations("Chat");
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "ar";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin the view to the newest message whenever one arrives.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="flex flex-1 items-center justify-center p-4 text-sm text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
    >
      {messages.map((m, i) => {
        const newDay =
          i === 0 || !sameLocalDay(messages[i - 1].created_at, m.created_at);
        return (
          <Fragment key={m.id}>
            {newDay && <DateSeparator iso={m.created_at} locale={locale} />}
            <MessageBubble message={m} />
          </Fragment>
        );
      })}
      {isTyping && (
        // mr-auto matches the customer bubble side above (physically fixed,
        // not logical self-start) — the indicator represents the customer, so
        // it sits where the customer's own messages sit, in every direction.
        <div className="mr-auto flex items-center gap-1.5 ps-1 text-sm text-muted">
          <span>{t("typingIndicator")}</span>
        </div>
      )}
    </div>
  );
}

function sameLocalDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function DateSeparator({ iso, locale }: { iso: string; locale: string }) {
  const t = useTranslations("Chat");
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);

  const label =
    date.toDateString() === today.toDateString()
      ? t("today")
      : date.toDateString() === yesterday.toDateString()
        ? t("yesterday")
        : date.toLocaleDateString(locale === "ar" ? "ar" : "en", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  return (
    <span className="self-center rounded-full border border-line bg-canvas px-3 py-0.5 text-xs text-muted">
      {label}
    </span>
  );
}

// Times render in tabular mono latin digits (the ledger convention used across
// the dashboard), always LTR.
function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.sender_type === "system") {
    return (
      <span className="max-w-[85%] self-center text-center text-xs text-muted">
        {message.content}
      </span>
    );
  }

  const isBusiness = message.sender_type === "business";
  const isAttachment = message.type === "image" || message.type === "file";
  return (
    <div
      className={`flex max-w-[75%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 ${
        isBusiness
          ? "ml-auto bg-ink text-paper"
          : "mr-auto border border-line bg-canvas text-ink"
      }`}
    >
      {isAttachment ? (
        <AttachmentLink message={message} isBusiness={isBusiness} />
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>
      )}
      <span
        dir="ltr"
        className={`self-end font-mono text-[10px] ${
          isBusiness ? "text-sage" : "text-muted"
        }`}
      >
        {hhmm(message.created_at)}
      </span>
    </div>
  );
}

// Attachments are private-bucket objects: file_path is a storage path, not a
// fetchable URL, so it can't be used as a plain href. The signed URL is
// resolved on click (via the message's own appointment_id/id — never a
// client-trusted path) and opened in a new tab; nothing is pre-fetched for
// messages that are never opened.
function AttachmentLink({
  message,
  isBusiness,
}: {
  message: ChatMessage;
  isBusiness: boolean;
}) {
  const t = useTranslations("Chat");
  const [resolving, setResolving] = useState(false);

  async function open() {
    if (resolving) return;
    setResolving(true);
    try {
      const res = await getChatAttachmentUrl(message.appointment_id, message.id);
      if (res.status === "success") {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    } finally {
      setResolving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={resolving}
      onClick={() => void open()}
      className={`flex items-center gap-1.5 text-sm underline underline-offset-2 disabled:opacity-60 ${
        isBusiness ? "text-paper" : "text-ink"
      }`}
    >
      <span aria-hidden>📎</span>
      <span className="max-w-[200px] truncate">{message.file_name ?? "—"}</span>
    </button>
  );
}
