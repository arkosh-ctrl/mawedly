import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BlogLocale, BlogPostRow, BlogStatus } from "./types";

// The hand-written Database type doesn't know the 0028 tables. Same local-merge
// pattern used for the admin/chat/notification tables (see lib/admin/db.ts).

type BlogPostInsert = {
  slug: string;
  cover_image?: string | null;
  status: BlogStatus;
  published_at?: string | null;
  author_id?: string | null;
};

type BlogTranslationRow = {
  id: string;
  post_id: string;
  locale: BlogLocale;
  title: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
};

type BlogTranslationInsert = {
  post_id: string;
  locale: BlogLocale;
  title: string;
  excerpt?: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  cover_image?: string | null;
};

export type BlogDatabase = {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      blog_posts: {
        Row: BlogPostRow;
        Insert: BlogPostInsert;
        Update: Partial<BlogPostInsert>;
        Relationships: [];
      };
      blog_post_translations: {
        Row: BlogTranslationRow;
        Insert: BlogTranslationInsert;
        Update: Partial<BlogTranslationInsert>;
        Relationships: [];
      };
    };
  };
};

export type BlogClient = SupabaseClient<BlogDatabase>;

/** Re-type a client so it knows the blog tables. */
export function withBlog(client: SupabaseClient<Database>): BlogClient {
  return client as unknown as BlogClient;
}
