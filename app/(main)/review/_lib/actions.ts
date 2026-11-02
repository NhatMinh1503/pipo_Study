"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { ratingSchema, scheduleReview } from "@/lib/srs/schedule";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";
import { createAdminClient } from "@/server/supabase-admin";

const reviewSchema = z.object({ cardId: z.uuid(), rating: ratingSchema });

/** Records a review: the server computes the next schedule from the stored card state. */
export async function reviewFlashcard(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("flashcards")
    .select("id, interval_days, ease, repetitions, lapses")
    .eq("id", parsed.data.cardId)
    .maybeSingle();
  if (!card) return { ok: false, error: "errors.unexpected" };

  const now = new Date();
  const next = scheduleReview(
    {
      intervalDays: card.interval_days,
      ease: Number(card.ease),
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    parsed.data.rating,
    now,
  );

  const { error } = await supabase
    .from("flashcards")
    .update({
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      lapses: next.lapses,
      due_date: next.dueDate.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", card.id);
  if (error) {
    logger.error("review update failed", { code: error.code, module: "review" });
    return { ok: false, error: "errors.unexpected" };
  }

  // Reviewing counts as studying today (streak) and earns 1 XP
  const user = await requireUser();
  await createAdminClient().rpc("wallet_apply", {
    p_user_id: user.id,
    p_xp_delta: 1,
    p_coins_delta: 0,
    p_reason: "flashcard_review",
    p_idempotency_key: `review:${card.id}:${now.toISOString()}`,
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
