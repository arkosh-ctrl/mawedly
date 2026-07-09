import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminRole, SystemEvent, SystemEventLevel } from "./types";

// The hand-written Database type doesn't know the 0016 tables. Following the
// same local-merge pattern used for chat_messages / notifications, the admin
// tables are declared here and merged into the client generic locally.

type AdminRow = { user_id: string; role: AdminRole; created_at: string };

type SystemEventInsert = {
  scope: string;
  event: string;
  level: SystemEventLevel;
  meta?: Record<string, unknown>;
  business_id?: string | null;
};

export type AdminDatabase = {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      admins: {
        Row: AdminRow;
        Insert: AdminRow;
        Update: Partial<AdminRow>;
        Relationships: [];
      };
      system_events: {
        Row: SystemEvent;
        Insert: SystemEventInsert;
        Update: Partial<SystemEventInsert>;
        Relationships: [];
      };
    };
  };
};

export type AdminClient = SupabaseClient<AdminDatabase>;

/** Re-type a client so it knows the admin tables. */
export function withAdmin(client: SupabaseClient<Database>): AdminClient {
  return client as unknown as AdminClient;
}
