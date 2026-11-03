import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const SEED_PASSWORD = "password123";

/** Signs in a seeded demo user against local Supabase, exactly like the browser would. */
export async function signInAs(email: string) {
  if (!url || !key) throw new Error("Missing Supabase env — run with `npm run test:int`.");

  const client = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);

  return { client, userId: data.user.id };
}
