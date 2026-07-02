// Hand-written database types matching Schema V3.2 (see
// docs/mawedly-master-spec-final.md and supabase/migrations/0001_init_schema_v3_2.sql).
// Can later be regenerated with: supabase gen types typescript.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          type: string;
          phone: string;
          notification_email: string | null;
          default_language: string | null;
          bank_name: string | null;
          bank_iban: string | null;
          bank_account_name: string | null;
          bank_qr_path: string | null;
          is_active: boolean | null;
          plan: string;
          work_start: string;
          work_end: string;
          trial_ends_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          type?: string;
          phone: string;
          notification_email?: string | null;
          default_language?: string | null;
          bank_name?: string | null;
          bank_iban?: string | null;
          bank_account_name?: string | null;
          bank_qr_path?: string | null;
          is_active?: boolean | null;
          plan?: string;
          work_start?: string;
          work_end?: string;
          trial_ends_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          type?: string;
          phone?: string;
          notification_email?: string | null;
          default_language?: string | null;
          bank_name?: string | null;
          bank_iban?: string | null;
          bank_account_name?: string | null;
          bank_qr_path?: string | null;
          is_active?: boolean | null;
          plan?: string;
          work_start?: string;
          work_end?: string;
          trial_ends_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      providers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          title: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          title?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          title?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          duration_minutes: number;
          price: number;
          deposit_amount: number;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          duration_minutes?: number;
          price: number;
          deposit_amount?: number;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          duration_minutes?: number;
          price?: number;
          deposit_amount?: number;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string;
          email: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone: string;
          email?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          provider_id: string;
          service_id: string;
          customer_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: string;
          deposit_screenshot_path: string | null;
          deposit_verified: boolean | null;
          customer_notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          provider_id: string;
          service_id: string;
          customer_id: string;
          appointment_date: string;
          start_time: string;
          // end_time is computed by the calculate_end_time trigger on insert/update.
          end_time?: string;
          status?: string;
          deposit_screenshot_path?: string | null;
          deposit_verified?: boolean | null;
          customer_notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          provider_id?: string;
          service_id?: string;
          customer_id?: string;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          deposit_screenshot_path?: string | null;
          deposit_verified?: boolean | null;
          customer_notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          business_id: string;
          appointment_id: string | null;
          action: string;
          actor: string | null;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          appointment_id?: string | null;
          action: string;
          actor?: string | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          appointment_id?: string | null;
          action?: string;
          actor?: string | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      booking_attempts: {
        Row: {
          id: string;
          ip: string | null;
          slug: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          ip?: string | null;
          slug?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          ip?: string | null;
          slug?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          appointment_id: string;
          business_id: string;
          rating: number;
          comment: string | null;
          reviewer_name: string | null;
          reviewer_phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          // Set by the reviews_set_business_id trigger; never sent by clients.
          business_id?: string;
          rating: number;
          comment?: string | null;
          reviewer_name?: string | null;
          reviewer_phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          business_id?: string;
          rating?: number;
          comment?: string | null;
          reviewer_name?: string | null;
          reviewer_phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience row aliases for application code.
type PublicTables = Database["public"]["Tables"];
export type Business = PublicTables["businesses"]["Row"];
export type Provider = PublicTables["providers"]["Row"];
export type Service = PublicTables["services"]["Row"];
export type Customer = PublicTables["customers"]["Row"];
export type Appointment = PublicTables["appointments"]["Row"];
export type Review = PublicTables["reviews"]["Row"];
export type AuditLog = PublicTables["audit_log"]["Row"];
