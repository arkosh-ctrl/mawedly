"use client";

import { Fragment, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/chat/types";

// Scrollable message list: direction-aware bubbles, a date separator between
// different days, and auto-scroll to the newest message.
//
// Bubble sides use logical alignment so the layout mirrors with the locale.
// In a column flex container the cross axis follows the inline direction, so
// self-start = inline-start (RIGHT in RTL) and self-end = inline-end (LEFT in
// RTL). The product requirement is business on the right / customer on the
// left in the Arabic dashboard — hence business gets self-start.
export function ChatMessagesList({ messages }: { messages: ChatMessage[] }) {
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
  return (
    <div
      className={`flex max-w-[75%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 ${
        isBusiness
          ? "self-start bg-ink text-paper"
          : "self-end border border-line bg-canvas text-ink"
      }`}
    >
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {message.content}
      </p>
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
