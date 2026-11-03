"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { addToNotebookSchema } from "@/lib/schemas/dictionary";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";

const UNIQUE_VIOLATION = "23505";

/** Saves a word with its context sentence and schedules a flashcard due now. */
export async function addToNotebook(input: unknown): Promise<ActionResult> {
  const parsed = addToNotebookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const word = parsed.data;
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("vocab_items")
    .insert({
      user_id: user.id,
      language: word.language,
      term: word.term,
      reading: word.reading || null,
      part_of_speech: word.partOfSpeech || null,
      meaning: word.meaning,
      context_sentence: word.contextSentence || null,
      context_translation: word.contextTranslation || null,
      sentence_id: word.sentenceId ?? null,
    })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) return { ok: false, error: "notebook.alreadySaved" };
  if (error || !item) {
    logger.error("add to notebook failed", { code: error?.code, module: "notebook" });
    return { ok: false, error: "errors.unexpected" };
  }

  const { error: cardError } = await supabase
    .from("flashcards")
    .insert({ user_id: user.id, vocab_item_id: item.id });
  if (cardError)
    logger.error("flashcard insert failed", { code: cardError.code, module: "notebook" });

  revalidatePath("/notebook");
  return { ok: true };
}

const updateMeaningSchema = z.object({
  id: z.uuid(),
  meaning: z.string().trim().max(500),
});

export async function updateVocabMeaning(input: unknown): Promise<ActionResult> {
  const parsed = updateMeaningSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vocab_items")
    .update({ meaning: parsed.data.meaning })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/notebook");
  return { ok: true };
}

export async function deleteVocabItem(id: unknown): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  // RLS limits this to the owner; the flashcard cascades
  const supabase = await createClient();
  const { error } = await supabase.from("vocab_items").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/notebook");
  return { ok: true };
}
