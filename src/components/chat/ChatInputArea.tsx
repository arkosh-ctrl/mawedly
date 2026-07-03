"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { sendMessage } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/types";

const MAX_HEIGHT_PX = 120;

// Composer: auto-resizing textarea (no external lib), Enter sends,
// Shift+Enter inserts a newline. The successfully created message is handed
// back to the parent so it appears immediately without waiting for realtime.
export function ChatInputArea({
  appointmentId,
  onSent,
}: {
  appointmentId: string;
  onSent: (message: ChatMessage) => void;
}) {
  const t = useTranslations("Chat");
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with content up to MAX_HEIGHT_PX, then scroll inside the textarea.
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  async function submit() {
    const content = value.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await sendMessage({ appointmentId, content, type: "text" });
      if (res.status === "success") {
        onSent(res.message);
        setValue("");
        const el = textareaRef.current;
        if (el) {
          el.style.height = "auto";
          el.focus();
        }
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    } catch {
      toast.error(t("messages.saveFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-line p-3">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={sending}
        aria-label={t("inputLabel")}
        placeholder={t("inputPlaceholder")}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={(e) => {
          // isComposing guards against sending mid-IME-composition.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="max-h-[120px] flex-1 resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-start text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink disabled:opacity-60"
      />
      <button
        type="button"
        disabled={sending || !value.trim()}
        onClick={() => void submit()}
        className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-50"
      >
        {sending ? t("sending") : t("send")}
      </button>
    </div>
  );
}
