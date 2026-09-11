import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client (used exclusively inside src/app/api/* route handlers).
// The service role key bypasses RLS, so this file must NEVER be imported
// from any "use client" component or otherwise bundled for the browser.
// It is the only place allowed to read the `solution` column.
export function supabaseServer() {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This must only be used in server-side API routes."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
