"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Toaster } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchChatHistory } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/types";
import {
  ChatMessagesList,
  type ClientChatMessage,
} from "@/components/chat/ChatMessagesList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";

const PAGE_SIZE = 50;
// Fallback only: merchant messages arrive instantly over the thread channel's
// "message" broadcast; the poll just heals missed events / reconnects.
const POLL_INTERVAL_MS = 30000;

// Errors after which polling stops for good — nothing about retrying can fix
// them. chatClosed is a normal terminal state (the appointment left the open
// statuses); notFound/invalidInput mean the link itself is bad, so retrying
// every tick forever would just spam the server for no benefit.
const PERMANENT_STOP_KEYS = ["chatClosed", "notFound", "invalidInput"];

// Customer-side thread view for the public /chat/[appointmentId] page: no
// session — possession of the appointment id is the credential (capability
// URL, the same access model as /review/[appointmentId]). RLS blocks an
// anonymous postgres_changes subscription, so live delivery uses the thread's
// open BROADCAST channel instead: the merchant container broadcasts each sent
// row as a "message" event (same capability model — the channel name is the
// unguessable appointment id). A slow poll remains as the safety net; each
// tick re-fetches page 0 and merges, preserving optimistic temp bubbles.
// Polling stops for good once the thread reports 'chatClosed' (the
// appointment left the open statuses), and the view is replaced by a
// closed-state message.
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

  const [messages, setMessages] = useState<ClientChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send-only channel: this page sends the "typing" broadcast for the
  // merchant's ChatContainer to receive; it never listens on this channel
  // itself (option B — customer sends, merchant receives).
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${appointmentId}`)
      // Live path: merchant messages pushed over broadcast (deduped by id —
      // the poll may deliver the same row later).
      .on<{ message?: ChatMessage }>(
        "broadcast",
        { event: "message" },
        ({ payload }) => {
          const msg = payload?.message;
          if (!msg?.id) return;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        },
      );
    channelRef.current = channel;
    channel.subscribe();
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [supabase, appointmentId]);

  // Debounced to once per second — the textarea's onChange fires on every
  // keystroke, but the merchant only needs a coarse "still typing" signal.
  function sendTyping() {
    const now = Date.now();
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { sender: "customer" },
    });
  }

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
        // Merge instead of replace: keep optimistic temp bubbles (not yet in
        // the DB) and any broadcast rows newer than this page snapshot.
        setMessages((prev) => {
          const ids = new Set(res.messages.map((m) => m.id));
          const extras = prev.filter((m) => !ids.has(m.id) && (m._state || m.created_at >= (res.messages.at(-1)?.created_at ?? "")));
          return [...res.messages, ...extras];
        });
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

  // Optimistic text sends: temp bubble instantly, replaced (or removed on
  // failure) once the server action settles.
  function handleOptimistic(message: ChatMessage) {
    setMessages((prev) => [...prev, { ...message, _state: "pending" as const }]);
  }

  function handleSettled(tempId: string, real: ChatMessage | null) {
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (!real) return withoutTemp;
      return withoutTemp.some((m) => m.id === real.id)
        ? withoutTemp
        : [...withoutTemp, real];
    });
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
      <ChatInputArea
        appointmentId={appointmentId}
        onSent={handleSent}
        onTyping={sendTyping}
        senderType="customer"
        onOptimistic={handleOptimistic}
        onSettled={handleSettled}
      />
      <Toaster dir={dir} richColors position="top-center" />
    </div>
  );
}
