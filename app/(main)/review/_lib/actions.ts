"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { isReviewRewardable, REVIEW_XP, reviewRewardKey } from "@/lib/review/reward";
import { ratingSchema, scheduleReview } from "@/lib/srs/schedule";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";
import { getCurrentProfile } from "@/server/profile";
import { createAdminClient } from "@/server/supabase-admin";

const reviewSchema = z.object({ cardId: z.uuid(), rating: ratingSchema });

/** Records a review: the server computes the next schedule from the stored card state. */
export async function reviewFlashcard(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const supabase = await createClient();
  // Read due_date before the schedule changes: whether this review pays depends on it
  const { data: card } = await supabase
    .from("flashcards")
    .select("id, interval_days, ease, repetitions, lapses, due_date")
    .eq("id", parsed.data.cardId)
    .eq("user_id", user.id)
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

  const { data: updated, error } = await supabase
    .from("flashcards")
    .update({
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      lapses: next.lapses,
      due_date: next.dueDate.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", card.id)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    logger.error("review update failed", { code: error.code, module: "review" });
    return { ok: false, error: "errors.unexpected" };
  }

  // The admin client bypasses RLS, so only pay once the user's own card was really updated
  if (updated.length !== 1) {
    logger.warn("review updated no card", { module: "review" });
    return { ok: false, error: "errors.unexpected" };
  }

  // A due card pays once per local day; this also counts as studying today (streak).
  // The profile time zone is the same one wallet_apply uses for the streak day.
  if (isReviewRewardable(card.due_date, now)) {
    const profile = await getCurrentProfile();
    await createAdminClient().rpc("wallet_apply", {
      p_user_id: user.id,
      p_xp_delta: REVIEW_XP,
      p_coins_delta: 0,
      p_reason: "flashcard_review",
      p_idempotency_key: reviewRewardKey(card.id, now, profile?.timezone ?? "UTC"),
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
