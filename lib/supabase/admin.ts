import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Service-role client: bypasses RLS. Server code only, and only after you've checked who the caller is.
 * Used for writing AI results (scores, flags) that reps must not be able to write themselves.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
