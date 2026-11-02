import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { VocabItem } from "@/lib/vocab/types";

/** The user's saved words, newest first, with their next review date. RLS scopes rows. */
export async function listVocabItems(limit = 500): Promise<VocabItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocab_items")
    .select(
      "id, language, term, reading, part_of_speech, meaning, context_sentence, context_translation, created_at, flashcards(due_date)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    language: item.language,
    term: item.term,
    reading: item.reading,
    partOfSpeech: item.part_of_speech,
    meaning: item.meaning,
    contextSentence: item.context_sentence,
    contextTranslation: item.context_translation,
    createdAt: item.created_at,
    dueDate: item.flashcards?.due_date ?? null,
  }));
}
