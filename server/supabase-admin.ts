import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

import { getServerEnv } from "./env";

/**
 * Supabase client with the secret key: bypasses RLS. Use only for writes clients are
 * not allowed to make (attempts, rewards) and always scope queries by user id yourself.
 */
export function createAdminClient() {
  return createClient<Database>(serverSupabaseUrl, getServerEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
