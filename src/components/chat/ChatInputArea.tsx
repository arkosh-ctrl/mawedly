"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { sendMessage } from "@/lib/chat/actions";
import type { ChatMessage, ChatMessageType } from "@/lib/chat/types";

const MAX_HEIGHT_PX = 120;

// Mirrors api/chat-upload/route.ts's ALLOWED set and MAX_BYTES — this is a
// client-side pre-check for a fast, friendly rejection; the route enforces
// both again server-side regardless.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ATTACHMENT_TYPES: Record<string, ChatMessageType> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "file",
};

// Composer: auto-resizing textarea (no external lib), Enter sends,
// Shift+Enter inserts a newline. The successfully created message is handed
// back to the parent so it appears immediately without waiting for realtime.
export function ChatInputArea({
  appointmentId,
  onSent,
  onTyping,
}: {
  appointmentId: string;
  onSent: (message: ChatMessage) => void;
  onTyping?: () => void;
}) {
  const t = useTranslations("Chat");
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = sending || uploading;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grow with content up to MAX_HEIGHT_PX, then scroll inside the textarea.
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  async function submit() {
    const content = value.trim();
    if (!content || busy) return;
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

  // Upload then send, in one user gesture: the object must exist in storage
  // before a chat_messages row can point at it. No preview/caption step — the
  // file is sent as soon as it's picked.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset now so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file || busy) return;

    const attachmentType = ATTACHMENT_TYPES[file.type];
    if (!attachmentType) {
      toast.error(t("messages.invalidType"));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t("messages.tooLarge"));
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("appointmentId", appointmentId);
      fd.set("file", file);
      const res = await fetch("/api/chat-upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(t(`messages.${data.error ?? "saveFailed"}`));
        return;
      }

      const sent = await sendMessage({
        appointmentId,
        type: attachmentType,
        fileData: {
          path: data.path,
          name: data.fileName,
          size: data.fileSize,
          mimeType: data.mimeType,
        },
      });
      if (sent.status === "success") {
        onSent(sent.message);
      } else {
        toast.error(t(`messages.${sent.messageKey}`));
      }
    } catch {
      toast.error(t("messages.saveFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-line p-3">
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
        disabled={busy}
        onChange={(e) => void handleFileChange(e)}
      />
      <button
        type="button"
        disabled={busy}
        aria-label={t("attach")}
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0 rounded-full border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-muted disabled:opacity-50"
      >
        <span aria-hidden>📎</span>
      </button>

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={busy}
        aria-label={t("inputLabel")}
        placeholder={t("inputPlaceholder")}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
          onTyping?.();
        }}
        onKeyDown={(e) => {
          // isComposing guards against sending mid-IME-composition.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="max-h-[120px] flex-1 resize-none rounded-lg border border-line bg-paper px-3 py-2 text-start text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary-light disabled:opacity-60"
      />
      <button
        type="button"
        disabled={busy || !value.trim()}
        onClick={() => void submit()}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {sending ? t("sending") : t("send")}
      </button>
    </div>
  );
}
