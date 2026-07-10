"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { fetchChatHistory, markMessagesRead } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/types";
import { ChatMessagesList } from "./ChatMessagesList";
import { ChatInputArea } from "./ChatInputArea";

const PAGE_SIZE = 50;
const TYPING_TIMEOUT_MS = 3000;

// One appointment's chat thread: history on mount, live INSERTs over Supabase
// Realtime, and a composer. For callerType='business' the realtime channel is
// authorized by the merchant's session against the RLS of migration 0012; an
// anonymous subscriber receives nothing (option B — the customer page will add
// polling when it lands), and marking messages read is merchant-only.
export function ChatContainer({
  appointmentId,
  callerType,
}: {
  appointmentId: string;
  callerType: "business" | "customer";
}) {
  const t = useTranslations("Chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single append point with id-dedupe: the sender's own action response and
  // the realtime INSERT event both deliver the same row.
  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }, []);

  // Initial history (newest page, returned ASC by the action).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    fetchChatHistory(appointmentId, 0, PAGE_SIZE, callerType)
      .then((res) => {
        if (cancelled) return;
        if (res.status === "success") setMessages(res.messages);
        else setError(res.messageKey);
      })
      .catch(() => {
        if (!cancelled) setError("saveFailed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId, callerType]);

  // Live INSERTs for this thread, plus the customer's "typing" broadcast — on
  // the SAME channel as the postgres_changes subscription (option B: customer
  // sends, merchant receives; the customer page never listens on this
  // channel). The 3s auto-clear covers a customer who stops typing without
  // sending — there's no explicit "stopped typing" event.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          appendMessage(payload.new as ChatMessage);
        },
      )
      .on<{ sender: string }>(
        "broadcast",
        { event: "typing" },
        ({ payload }) => {
          if (payload?.sender === "customer") {
            setIsCustomerTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(
              () => setIsCustomerTyping(false),
              TYPING_TIMEOUT_MS,
            );
          }
        },
      )
      .subscribe();
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [appointmentId, appendMessage]);

  // Opening the thread clears the merchant's unread counter for it.
  useEffect(() => {
    if (callerType === "business") void markMessagesRead(appointmentId);
  }, [appointmentId, callerType]);

  return (
    <div className="flex h-96 flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      {loading ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted">
          {t("loading")}
        </p>
      ) : error ? (
        <p className="flex flex-1 items-center justify-center text-sm text-brick">
          {t(`messages.${error}`)}
        </p>
      ) : (
        <ChatMessagesList messages={messages} isTyping={isCustomerTyping} />
      )}
      <ChatInputArea appointmentId={appointmentId} onSent={appendMessage} />
    </div>
  );
}
