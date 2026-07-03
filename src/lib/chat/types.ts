// Chat domain types — shared by the server actions (lib/chat/actions.ts) and,
// in Phase 4, the chat UI components. Column names/order mirror the
// chat_messages table (migration 0012) exactly.

export type ChatSender = "business" | "customer" | "system";

export type ChatMessageType = "text" | "image" | "file" | "system_message";

export type ChatMessage = {
  id: string;
  appointment_id: string;
  business_id: string;
  sender_type: ChatSender;
  sender_id: string | null;
  type: ChatMessageType;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

// Input for sendMessage. For type 'image'|'file', fileData is required — path
// comes from the api/chat-upload response (the object already lives in the
// chat-attachments bucket by the time sendMessage is called; this just records
// the pointer + display metadata on the message row).
export type SendMessageInput = {
  appointmentId: string;
  content?: string;
  type?: ChatMessageType;
  fileData?: {
    path: string;
    name: string;
    size: number;
    mimeType: string;
  };
};

export type FetchHistoryResult = {
  messages: ChatMessage[];
  hasMore: boolean;
};
