import "server-only";

import { connection } from "next/server";

import type { ReviewCard } from "@/lib/srs/types";
import { createClient } from "@/lib/supabase/server";

export const REVIEW_SESSION_SIZE = 50;

/** Flashcards due now (oldest first) with their words. RLS scopes rows to the user. */
export async function getDueFlashcards(limit = REVIEW_SESSION_SIZE): Promise<ReviewCard[]> {
  await connection();
  const now = new Date();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("flashcards")
    .select(
      "id, vocab_items(language, term, reading, meaning, context_sentence, context_translation)",
    )
    .lte("due_date", now.toISOString())
    .order("due_date")
    .limit(limit);
  if (error) throw error;

  return data.flatMap((card) => {
    const item = card.vocab_items;
    if (!item) return [];
    return [
      {
        id: card.id,
        language: item.language,
        term: item.term,
        reading: item.reading,
        meaning: item.meaning,
        contextSentence: item.context_sentence,
        contextTranslation: item.context_translation,
      },
    ];
  });
}
