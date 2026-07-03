"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ChatMessage,
  ChatMessageType,
  ChatSender,
  FetchHistoryResult,
  SendMessageInput,
} from "./types";

// The hand-written Database type predates migration 0012 and doesn't know
// chat_messages, and the Phase-2 constraint is that no existing file changes —
// so the table's types are declared here and merged into the client generic
// locally (the original tables stay fully typed). Follow-up: fold this block
// into database.types.ts, where booking_attempts and reviews already live.
type ChatMessageInsert = {
  id?: string;
  appointment_id: string;
  // Set by the chat_messages_set_business_id trigger; never sent by clients.
  business_id?: string;
  sender_type: ChatSender;
  sender_id?: string | null;
  type?: ChatMessageType;
  content?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
};

type ChatDatabase = {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      chat_messages: {
        Row: ChatMessage;
        Insert: ChatMessageInsert;
        Update: Partial<ChatMessageInsert>;
        Relationships: [];
      };
    };
  };
};

type ChatClient = SupabaseClient<ChatDatabase>;

function withChat(client: unknown): ChatClient {
  return client as ChatClient;
}

// Server actions for the per-appointment chat thread (option B architecture):
// the MERCHANT talks to chat_messages through the authenticated client (RLS
// enforces ownership); the CUSTOMER has no account and no anon policies exist,
// so every customer read/write runs through the service_role client AFTER this
// code has verified possession of the appointment id (capability URL — the
// same access model as the review system). The SECURITY DEFINER trigger from
// migration 0012 is the hard guard: it derives business_id from the real
// appointment and rejects writes unless the appointment status is in
// ('pending_verification','confirmed') — regardless of which role inserts.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Statuses in which the chat thread is open for writing. MUST mirror the
// trigger in migration 0012.
const CHAT_OPEN_STATUSES = ["pending_verification", "confirmed"];

const MAX_CONTENT_LENGTH = 2000;

// Types a client may set directly. 'system_message' is reserved for
// server-originated rows and is never accepted from sendMessage's input.
const CLIENT_MESSAGE_TYPES: ChatMessageType[] = ["text", "image", "file"];

// Mirrors the ALLOWED set in api/chat-upload/route.ts — defense in depth so a
// forged fileData.mimeType can't slip past sendMessage even if the upload
// route is bypassed.
const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// Everything the SELECTs below return — kept as one constant so the row shape
// always matches the ChatMessage type.
const MESSAGE_COLUMNS =
  "id, appointment_id, business_id, sender_type, sender_id, type, content, file_path, file_name, file_size, mime_type, is_read, read_at, created_at";

export type SendMessageResult =
  | { status: "success"; messageKey: string; message: ChatMessage }
  | { status: "error"; messageKey: string };

export type ChatHistoryResult =
  | ({ status: "success" } & FetchHistoryResult)
  | { status: "error"; messageKey: string };

export type MarkReadResult = {
  status: "success" | "error";
  messageKey: string;
};

// Send one text message into an appointment's thread.
//
// Caller detection: a session whose user owns the appointment's business is the
// merchant path (authenticated client, RLS-checked, sender 'business'). No
// session is the customer path (service_role AFTER server-side verification of
// the appointment id + open status, sender 'customer' with sender_id taken from
// the appointment's own customer_id — never from the caller). An authenticated
// user who does NOT own the appointment is rejected, never downgraded to the
// customer path.
export async function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  try {
    const appointmentId = String(input?.appointmentId ?? "");
    const type = input?.type ?? "text";
    const fileData = input?.fileData;

    if (!UUID_RE.test(appointmentId) || !CLIENT_MESSAGE_TYPES.includes(type)) {
      return { status: "error", messageKey: "invalidInput" };
    }

    // Exactly one of (text content) or (attachment) per message — never both,
    // never neither. The DB CHECK (content IS NOT NULL OR file_path IS NOT
    // NULL) allows either alone; this action doesn't offer a captioned
    // attachment, so the two are kept mutually exclusive here.
    let content: string | null = null;
    if (type === "text") {
      const trimmed = String(input?.content ?? "").trim();
      if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH || fileData) {
        return { status: "error", messageKey: "invalidInput" };
      }
      content = trimmed;
    } else if (
      !fileData?.path ||
      !fileData.name ||
      !(fileData.size > 0) ||
      !ALLOWED_ATTACHMENT_MIME_TYPES.includes(fileData.mimeType)
    ) {
      // The object itself was already validated by api/chat-upload; this
      // re-checks the metadata isn't obviously forged before it's persisted.
      return { status: "error", messageKey: "invalidInput" };
    }

    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    const supabase = withChat(session);

    if (userId) {
      // Merchant path — ownership enforced explicitly (business lookup +
      // business_id filter) and again by RLS on the insert.
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!business) return { status: "error", messageKey: "noBusiness" };

      const { data: appt } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("id", appointmentId)
        .eq("business_id", business.id)
        .maybeSingle();
      if (!appt) return { status: "error", messageKey: "notFound" };
      // Friendly pre-check; the trigger re-enforces this on insert.
      if (!CHAT_OPEN_STATUSES.includes(appt.status)) {
        return { status: "error", messageKey: "chatClosed" };
      }

      // business_id is omitted: the BEFORE-INSERT trigger derives it from the
      // appointment and overwrites anything a client could supply.
      const { data: inserted, error } = await supabase
        .from("chat_messages")
        .insert({
          appointment_id: appointmentId,
          sender_type: "business",
          sender_id: userId,
          type,
          content,
          file_path: fileData?.path ?? null,
          file_name: fileData?.name ?? null,
          file_size: fileData?.size ?? null,
          mime_type: fileData?.mimeType ?? null,
        })
        .select(MESSAGE_COLUMNS)
        .single();
      if (error || !inserted) {
        // P0001 = the trigger's generic rejection (appointment left the open
        // statuses between the pre-check and the insert).
        if (error?.code === "P0001") {
          return { status: "error", messageKey: "chatClosed" };
        }
        return { status: "error", messageKey: "saveFailed" };
      }

      revalidatePath("/[locale]/dashboard/appointments", "page");
      return {
        status: "success",
        messageKey: "messageSent",
        message: inserted as ChatMessage,
      };
    }

    // Customer path — anonymous. Possession of the appointment id is the
    // credential; verify it and the open status server-side before any write.
    const admin = withChat(createAdminClient());
    const { data: appt } = await admin
      .from("appointments")
      .select("id, status, customer_id")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appt) return { status: "error", messageKey: "notFound" };
    if (!CHAT_OPEN_STATUSES.includes(appt.status)) {
      return { status: "error", messageKey: "chatClosed" };
    }

    const { data: inserted, error } = await admin
      .from("chat_messages")
      .insert({
        appointment_id: appointmentId,
        sender_type: "customer",
        // Derived from the appointment itself — the caller never supplies it.
        sender_id: appt.customer_id,
        type,
        content,
        file_path: fileData?.path ?? null,
        file_name: fileData?.name ?? null,
        file_size: fileData?.size ?? null,
        mime_type: fileData?.mimeType ?? null,
      })
      .select(MESSAGE_COLUMNS)
      .single();
    if (error || !inserted) {
      if (error?.code === "P0001") {
        return { status: "error", messageKey: "chatClosed" };
      }
      return { status: "error", messageKey: "saveFailed" };
    }

    return {
      status: "success",
      messageKey: "messageSent",
      message: inserted as ChatMessage,
    };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// One page of an appointment's thread, returned in created_at ASC order (ready
// to render top-to-bottom). Pages count backwards from the newest message:
// page 0 is the most recent `limit` messages, page 1 the ones before, etc. —
// the query reads DESC (matching the migration-0012 index), fetches limit+1
// rows to learn hasMore, then reverses in memory.
//
// callerType comes from the client and is therefore NOT trusted as an
// authorization claim — it only picks which path runs, and each path carries
// its own authorization: 'business' uses the authenticated client (RLS scopes
// rows to the caller's own business; no session sees nothing), 'customer' uses
// service_role gated on possession of a valid appointment id. Reading stays
// open in terminal states for both parties (the archive); only WRITING is
// closed by the trigger.
export async function fetchChatHistory(
  appointmentId: string,
  page: number,
  limit: number,
  callerType: "business" | "customer",
): Promise<ChatHistoryResult> {
  try {
    if (!UUID_RE.test(String(appointmentId ?? ""))) {
      return { status: "error", messageKey: "invalidInput" };
    }
    const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
    const safeLimit =
      Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 50;
    const from = safePage * safeLimit;
    // One extra row answers hasMore without a second count query.
    const to = from + safeLimit;

    let rows: ChatMessage[] | null = null;

    if (callerType === "business") {
      const session = await createClient();
      const { data: claims } = await session.auth.getClaims();
      if (!claims?.claims?.sub) {
        return { status: "error", messageKey: "unauthorized" };
      }
      const supabase = withChat(session);
      // RLS filters to the merchant's own businesses; a foreign appointment id
      // simply yields an empty page.
      const { data, error } = await supabase
        .from("chat_messages")
        .select(MESSAGE_COLUMNS)
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) return { status: "error", messageKey: "saveFailed" };
      rows = data as ChatMessage[] | null;
    } else {
      // Customer path: verify the appointment exists before service_role reads.
      const admin = withChat(createAdminClient());
      const { data: appt } = await admin
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .maybeSingle();
      if (!appt) return { status: "error", messageKey: "notFound" };

      const { data, error } = await admin
        .from("chat_messages")
        .select(MESSAGE_COLUMNS)
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) return { status: "error", messageKey: "saveFailed" };
      rows = data as ChatMessage[] | null;
    }

    const fetched = rows ?? [];
    const hasMore = fetched.length > safeLimit;
    const messages = fetched.slice(0, safeLimit).reverse(); // DESC -> ASC

    return { status: "success", messages, hasMore };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

// Merchant-only: mark all unread CUSTOMER messages in one thread as read.
// Runs on the authenticated client — the RLS update policy scopes rows to the
// merchant's business, and the column-level grant (migration 0012) means only
// is_read/read_at can change. The explicit business_id filter mirrors the
// defense-in-depth style of appointments/actions.ts.
export async function markMessagesRead(
  appointmentId: string,
): Promise<MarkReadResult> {
  try {
    if (!UUID_RE.test(String(appointmentId ?? ""))) {
      return { status: "error", messageKey: "invalidInput" };
    }

    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { status: "error", messageKey: "unauthorized" };
    const supabase = withChat(session);

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!business) return { status: "error", messageKey: "noBusiness" };

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("appointment_id", appointmentId)
      .eq("business_id", business.id)
      .eq("sender_type", "customer")
      .eq("is_read", false);
    if (error) return { status: "error", messageKey: "saveFailed" };

    revalidatePath("/[locale]/dashboard/appointments", "page");
    return { status: "success", messageKey: "messagesRead" };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}

export type ChatAttachmentUrlResult =
  | { status: "success"; url: string }
  | { status: "error"; messageKey: string };

// Resolve a short-lived signed URL for one message's attachment. The path used
// for signing is always read back from the MESSAGE'S OWN file_path column —
// never a client-supplied path — so a forged path can't be signed against an
// unrelated business's object. Business callers are scoped by the chat_messages
// SELECT policy (RLS); customer callers are scoped by an explicit
// appointment_id match via service_role (same capability-URL model as the rest
// of this file). Matches messageId to appointmentId in one query, so a message
// id from a different thread never resolves even if guessed.
export async function getChatAttachmentUrl(
  appointmentId: string,
  messageId: string,
): Promise<ChatAttachmentUrlResult> {
  try {
    if (
      !UUID_RE.test(String(appointmentId ?? "")) ||
      !UUID_RE.test(String(messageId ?? ""))
    ) {
      return { status: "error", messageKey: "invalidInput" };
    }

    const session = await createClient();
    const { data: claims } = await session.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;

    const client = userId ? session : createAdminClient();
    const typedClient = withChat(client);

    const { data: row } = await typedClient
      .from("chat_messages")
      .select("file_path")
      .eq("id", messageId)
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    if (!row?.file_path) {
      return { status: "error", messageKey: "notFound" };
    }

    const { data: signed, error } = await client.storage
      .from("chat-attachments")
      .createSignedUrl(row.file_path, 300);
    if (error || !signed?.signedUrl) {
      return { status: "error", messageKey: "saveFailed" };
    }

    return { status: "success", url: signed.signedUrl };
  } catch {
    return { status: "error", messageKey: "saveFailed" };
  }
}
