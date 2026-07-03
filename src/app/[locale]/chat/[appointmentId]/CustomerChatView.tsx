"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Toaster } from "sonner";
import { fetchChatHistory } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/types";
import { ChatMessagesList } from "@/components/chat/ChatMessagesList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";

const PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 4000;

// Errors after which polling stops for good — nothing about retrying can fix
// them. chatClosed is a normal terminal state (the appointment left the open
// statuses); notFound/invalidInput mean the link itself is bad, so retrying
// every tick forever would just spam the server for no benefit.
const PERMANENT_STOP_KEYS = ["chatClosed", "notFound", "invalidInput"];

// Customer-side thread view for the public /chat/[appointmentId] page (option
// B): no session and no Realtime — possession of the appointment id is the
// credential (capability URL, the same access model as
// /review/[appointmentId]). History is polled on an interval; each tick
// re-fetches page 0 and replaces the message list wholesale — simple, with no
// merge logic to get wrong. Polling stops for good once the thread reports
// 'chatClosed' (the appointment left the open statuses), and the view is
// replaced by a closed-state message.
//
// Renders its own <Toaster>: this page sits outside the dashboard layout,
// the only place a <Toaster> is mounted, and ChatInputArea (reused as-is,
// unmodified) reports send failures via toast — without one here those
// failures would be silent for the customer.
export function CustomerChatView({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const t = useTranslations("Chat");
  const tCustomer = useTranslations("Chat.customer");
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetchChatHistory(
        appointmentId,
        0,
        PAGE_SIZE,
        "customer",
      );
      if (cancelled) return;
      if (res.status === "success") {
        setMessages(res.messages);
        setError(null);
      } else if (PERMANENT_STOP_KEYS.includes(res.messageKey)) {
        setClosed(true);
        clearInterval(timer);
      } else {
        setError(res.messageKey);
      }
      setLoading(false);
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [appointmentId]);

  // Append the customer's own sent message immediately, without waiting for
  // the next poll tick. Deduped by id against whatever the next tick returns.
  function handleSent(message: ChatMessage) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
  }

  if (closed) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-paper p-6 text-center">
        <h2 className="font-display text-lg font-bold text-ink">
          {tCustomer("closedTitle")}
        </h2>
        <p className="text-sm text-muted">{tCustomer("closedMessage")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-96 flex-col overflow-hidden rounded-xl border border-line bg-paper">
      {loading ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted">
          {t("loading")}
        </p>
      ) : error ? (
        <p className="flex flex-1 items-center justify-center text-sm text-brick">
          {t(`messages.${error}`)}
        </p>
      ) : (
        <ChatMessagesList messages={messages} />
      )}
      <ChatInputArea appointmentId={appointmentId} onSent={handleSent} />
      <Toaster dir={dir} richColors position="top-center" />
    </div>
  );
}
