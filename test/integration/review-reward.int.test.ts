import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { rewardReview } from "@/server/services/review-reward";
import type { Database } from "@/types/database";

import { signInAs } from "./supabase-client";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);

// Rewards for a review (xp-levels §3.3–3.5). Uses demo2 and restores its wallet afterwards.
describe("rewardReview (local Supabase)", async () => {
  const learner = await signInAs("demo2@pipo.local");
  let walletBefore: Database["public"]["Tables"]["wallets"]["Row"] | null = null;
  const NOW = new Date("2026-11-05T03:00:00.000Z");
  const PAST = "2026-11-04T00:00:00.000Z";
  const FUTURE = "2026-11-06T00:00:00.000Z";
  const card = (id: string, dueDate: string) => ({ id, dueDate, reviewedBefore: true });

  beforeAll(async () => {
    const { data } = await admin.from("wallets").select("*").eq("user_id", learner.userId).single();
    walletBefore = data;
    await admin
      .from("wallets")
      .update({ streak_current: 0, last_active_date: null })
      .eq("user_id", learner.userId);
  });

  afterAll(async () => {
    await admin
      .from("transactions")
      .delete()
      .eq("user_id", learner.userId)
      .like("idempotency_key", "review:it-%");
    if (walletBefore)
      await admin.from("wallets").update(walletBefore).eq("user_id", learner.userId);
  });

  const reward = (c: ReturnType<typeof card>) =>
    rewardReview({
      adminClient: admin,
      userId: learner.userId,
      card: c,
      now: NOW,
      timeZone: "UTC",
    });

  const wallet = async () =>
    (
      await admin
        .from("wallets")
        .select("xp, streak_current")
        .eq("user_id", learner.userId)
        .single()
    ).data;

  it("a card that is not due yet pays nothing and is not study activity", async () => {
    const start = await wallet();
    expect(await reward(card("it-early", FUTURE))).toMatchObject({ xp: 0 });
    expect(await wallet()).toEqual(start);
  });

  it("a due card pays 1 XP and counts as study activity", async () => {
    const start = await wallet();
    expect(await reward(card("it-due", PAST))).toMatchObject({ xp: 1 });
    expect(await wallet()).toEqual({ xp: (start?.xp ?? 0) + 1, streak_current: 1 });
  });

  it("the same card pays only once per local day", async () => {
    const start = await wallet();
    expect(await reward(card("it-due", PAST))).toMatchObject({ xp: 0 });
    expect((await wallet())?.xp).toBe(start?.xp);
  });
});
