"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { wasReviewedBefore } from "@/lib/review/reward";
import { ratingSchema, scheduleReview } from "@/lib/srs/schedule";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";
import { getCurrentProfile } from "@/server/profile";
import { type ReviewReward, rewardReview } from "@/server/services/review-reward";
import { createAdminClient } from "@/server/supabase-admin";

const reviewSchema = z.object({ cardId: z.uuid(), rating: ratingSchema });

export type ReviewActionResult = { ok: true; reward: ReviewReward } | { ok: false; error?: string };

/** Records a review: the server computes the next schedule from the stored card state. */
export async function reviewFlashcard(input: unknown): Promise<ReviewActionResult> {
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

  // Learners cannot write the schedule (it decides review rewards), so the server does,
  // scoped to the signed-in learner's own card
  const { data: updated, error } = await createAdminClient()
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

  // A due card pays once per local day and keeps the streak. The profile time zone is the
  // same one the streak uses.
  const profile = await getCurrentProfile();
  const reward = await rewardReview({
    adminClient: createAdminClient(),
    userId: user.id,
    // Read before the update above, so this is the card's state before this review
    card: { id: card.id, dueDate: card.due_date, reviewedBefore: wasReviewedBefore(card) },
    now,
    timeZone: profile?.timezone ?? "UTC",
  });

  revalidatePath("/dashboard");
  return { ok: true, reward };
}
