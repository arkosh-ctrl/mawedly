import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role Supabase client — SERVER ONLY.
//
// `import "server-only"` makes the build fail if this module is ever pulled
// into a Client Component, so the service-role key can never reach the browser.
// This client BYPASSES RLS, so it must only be used in trusted server code:
//   - reading public booking-page data (the businesses table is owner-only now)
//   - the booking insert route (validation happens in code, not RLS)
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
