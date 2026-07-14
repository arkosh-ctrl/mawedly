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
          monthly_appointments_count: number;
          usage_reset_at: string;
          lemon_subscription_id: string | null;
          lemon_customer_id: string | null;
          subscription_status: string;
          subscription_renews_at: string | null;
          brand_logo_path: string | null;
          brand_color: string | null;
          tagline: string | null;
          requires_license: boolean;
          license_number: string | null;
          license_issuer: string | null;
          license_document_path: string | null;
          verification_status: string;
          license_verified_at: string | null;
          terms_accepted_at: string | null;
          marketing_consent: boolean;
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
          monthly_appointments_count?: number;
          usage_reset_at?: string;
          lemon_subscription_id?: string | null;
          lemon_customer_id?: string | null;
          subscription_status?: string;
          subscription_renews_at?: string | null;
          brand_logo_path?: string | null;
          brand_color?: string | null;
          tagline?: string | null;
          requires_license?: boolean;
          license_number?: string | null;
          license_issuer?: string | null;
          license_document_path?: string | null;
          verification_status?: string;
          license_verified_at?: string | null;
          terms_accepted_at?: string | null;
          marketing_consent?: boolean;
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
          monthly_appointments_count?: number;
          usage_reset_at?: string;
          lemon_subscription_id?: string | null;
          lemon_customer_id?: string | null;
          subscription_status?: string;
          subscription_renews_at?: string | null;
          brand_logo_path?: string | null;
          brand_color?: string | null;
          tagline?: string | null;
          requires_license?: boolean;
          license_number?: string | null;
          license_issuer?: string | null;
          license_document_path?: string | null;
          verification_status?: string;
          license_verified_at?: string | null;
          terms_accepted_at?: string | null;
          marketing_consent?: boolean;
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
          // in_person | virtual | phone (migration 0011).
          session_type: string;
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
          session_type?: string;
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
          session_type?: string;
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
          phone: string | null;
          email: string | null;
          notes: string | null;
          job_title: string | null;
          company: string | null;
          linkedin_url: string | null;
          timezone: string | null;
          country: string | null;
          city: string | null;
          custom_fields: Record<string, string>;
          source: string;
          is_favorite: boolean;
          deleted_at: string | null;
          updated_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          job_title?: string | null;
          company?: string | null;
          linkedin_url?: string | null;
          timezone?: string | null;
          country?: string | null;
          city?: string | null;
          custom_fields?: Record<string, string>;
          source?: string;
          is_favorite?: boolean;
          deleted_at?: string | null;
          updated_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          job_title?: string | null;
          company?: string | null;
          linkedin_url?: string | null;
          timezone?: string | null;
          country?: string | null;
          city?: string | null;
          custom_fields?: Record<string, string>;
          source?: string;
          is_favorite?: boolean;
          deleted_at?: string | null;
          updated_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      sent_emails: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          to_email: string;
          subject: string;
          body: string;
          status: string;
          resend_message_id: string | null;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          to_email: string;
          subject: string;
          body: string;
          status?: string;
          resend_message_id?: string | null;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          to_email?: string;
          subject?: string;
          body?: string;
          status?: string;
          resend_message_id?: string | null;
          sent_at?: string | null;
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
          // Calendar-integration tracking (migration 0015).
          calendar_added: boolean | null;
          calendar_added_at: string | null;
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
          calendar_added?: boolean | null;
          calendar_added_at?: string | null;
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
          calendar_added?: boolean | null;
          calendar_added_at?: string | null;
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
      business_social_links: {
        Row: {
          id: string;
          business_id: string;
          platform: string;
          url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          platform: string;
          url: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          platform?: string;
          url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      social_shares: {
        Row: {
          id: string;
          business_id: string;
          review_id: string;
          platform: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          review_id: string;
          platform: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          review_id?: string;
          platform?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_webhook_events: {
        Row: {
          id: string;
          lemon_event_id: string;
          event_name: string;
          business_id: string | null;
          payload: unknown;
          processed: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lemon_event_id: string;
          event_name: string;
          business_id?: string | null;
          payload: unknown;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lemon_event_id?: string;
          event_name?: string;
          business_id?: string | null;
          payload?: unknown;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
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
export type BusinessSocialLink = PublicTables["business_social_links"]["Row"];
export type SocialShare = PublicTables["social_shares"]["Row"];
