import { createClient } from "@supabase/supabase-js";

// Test-only: talks to the local Supabase with the secret key from .env.local
process.loadEnvFile(".env.local");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);

/** Credits coins to a test user through the same wallet function the app uses. */
export async function grantCoins(email: string, coins: number) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`No user ${email}`);

  const { error } = await admin.rpc("wallet_apply", {
    p_user_id: user.id,
    p_xp_delta: 0,
    p_coins_delta: coins,
    p_reason: "e2e_grant",
    p_idempotency_key: `e2e:${Date.now()}`,
  });
  if (error) throw error;
}

/** Cancels every open lobby so a battle test only ever meets its own second player. */
export async function cancelWaitingBattles() {
  const { error } = await admin
    .from("battles")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("status", "waiting");
  if (error) throw error;
}
