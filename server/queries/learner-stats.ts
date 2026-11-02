import "server-only";

import { cache } from "react";

import type { LearnerStats } from "@/lib/skills/tree";
import { createClient } from "@/lib/supabase/server";

/** Counts behind the skill tree and the profile page. RLS scopes every count to the user. */
export const getLearnerStats = cache(async (): Promise<LearnerStats> => {
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };

  const [lessons, words, cards, focus] = await Promise.all([
    supabase.from("lessons").select("id", count).not("completed_at", "is", null),
    supabase.from("vocab_items").select("id", count),
    supabase.from("flashcards").select("repetitions, lapses"),
    supabase.from("pomodoro_sessions").select("id", count).eq("status", "completed"),
  ]);

  return {
    lessonsCompleted: lessons.count ?? 0,
    wordsSaved: words.count ?? 0,
    // Every review either advanced the card (repetition) or reset it (lapse)
    reviews: (cards.data ?? []).reduce((sum, card) => sum + card.repetitions + card.lapses, 0),
    focusSessions: focus.count ?? 0,
  };
});
