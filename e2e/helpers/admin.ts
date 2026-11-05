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
  await grantRewards(email, { xp: 0, coins });
}

/** Credits XP, e.g. to put a fresh test user at the top of the leaderboard. */
export async function grantXp(email: string, xp: number) {
  await grantRewards(email, { xp, coins: 0 });
}

async function findUserId(email: string): Promise<string> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`No user ${email}`);
  return user.id;
}

async function grantRewards(email: string, { xp, coins }: { xp: number; coins: number }) {
  const { error } = await admin.rpc("wallet_apply", {
    p_user_id: await findUserId(email),
    p_xp_delta: xp,
    p_coins_delta: coins,
    p_reason: "e2e_grant",
    p_idempotency_key: `e2e:${crypto.randomUUID()}`,
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

/**
 * Teardown for tests that create lessons on the shared demo account: deletes exactly the
 * lesson with this title, so a test that fails half-way leaves nothing behind (leftover
 * lessons would push the seeded lesson out of the dashboard's "in progress" list).
 */
export async function deleteLessonByTitle(email: string, title: string) {
  const { error } = await admin
    .from("lessons")
    .delete()
    .eq("user_id", await findUserId(email))
    .eq("title", title);
  if (error) throw error;
}
