import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { collectLessonWords, type LessonWord } from "@/lib/dictionary/lesson-words";
import type { DisplayLanguage } from "@/lib/schemas/common";
import type { BatchExplainer } from "@/server/ai/explainer";
import { logger } from "@/server/logger";
import { MAX_WORDS_PER_CALL } from "@/server/prompts/explain-words.v1";
import { getTokenizedWorkspace } from "@/server/services/ensure-tokens";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** AI calls per warm-up request; a long lesson finishes over the next visits. */
export const MAX_CALLS_PER_WARM = 2;

export class WarmVocabularyError extends Error {
  constructor(readonly code: "NOT_FOUND" | "INTERNAL") {
    super(code);
  }
}

export interface WarmResult {
  /** Words newly explained and cached by this request. */
  explained: number;
  /** Words still without a cached meaning in the learner's display language. */
  pending: number;
  /** True when the daily AI quota stopped the warm-up early. */
  limited: boolean;
}

interface WarmParams {
  userClient: Client;
  adminClient: Client;
  lessonId: string;
  displayLanguage: DisplayLanguage;
  explainBatch: BatchExplainer;
  dailyLimit: number;
}

const keyOf = (term: string, reading: string) => `${term}\u0000${reading}`;

async function findMissing(
  client: Client,
  language: Database["public"]["Enums"]["learning_language"],
  displayLanguage: DisplayLanguage,
  words: LessonWord[],
): Promise<LessonWord[]> {
  const { data, error } = await client
    .from("word_explanations")
    .select("term, reading")
    .eq("language", language)
    .eq("display_language", displayLanguage)
    .in("term", [...new Set(words.map((word) => word.term))]);
  if (error) throw new WarmVocabularyError("INTERNAL");
  const cached = new Set((data ?? []).map((row) => keyOf(row.term, row.reading)));
  return words.filter((word) => !cached.has(keyOf(word.term, word.reading)));
}

/**
 * Explains, in one or two AI calls, every word of a lesson that has no cached meaning yet in
 * the learner's display language, so popups show a meaning straight away. Meanings go to the
 * shared cache (one call helps every learner). Each call counts once against the daily quota.
 */
export async function warmLessonVocabulary({
  userClient,
  adminClient,
  lessonId,
  displayLanguage,
  explainBatch,
  dailyLimit,
}: WarmParams): Promise<WarmResult> {
  // RLS: someone else's lesson simply is not found
  const workspace = await getTokenizedWorkspace(userClient, lessonId);
  if (!workspace) throw new WarmVocabularyError("NOT_FOUND");

  const words = collectLessonWords(workspace.sentences);
  if (words.length === 0) return { explained: 0, pending: 0, limited: false };
  const missing = await findMissing(userClient, workspace.language, displayLanguage, words);

  let explained = 0;
  let limited = false;
  for (let call = 0; call < MAX_CALLS_PER_WARM; call++) {
    const batch = missing.slice(call * MAX_WORDS_PER_CALL, (call + 1) * MAX_WORDS_PER_CALL);
    if (batch.length === 0) break;

    const { data: allowed, error } = await userClient.rpc("rate_limit_hit", {
      p_key: "ai",
      p_limit: dailyLimit,
    });
    if (error) throw new WarmVocabularyError("INTERNAL");
    if (!allowed) {
      limited = true;
      break;
    }

    let answer;
    try {
      answer = await explainBatch({
        language: workspace.language,
        displayLanguage,
        words: batch,
      });
    } catch (cause) {
      // Warming is best effort: the popup's "Explain" button still works word by word
      logger.warn("warm vocabulary call failed", { module: "warm-vocabulary", err: cause });
      break;
    }
    if (!explainBatch.cacheable) break;

    // Only keep answers for words we asked about, matched by their exact spelling
    const asked = new Map(batch.map((word) => [word.term, word]));
    const rows = answer.words.flatMap((item) => {
      const word = asked.get(item.term);
      if (!word) return [];
      asked.delete(item.term);
      return [
        {
          language: workspace.language,
          term: word.term,
          reading: word.reading,
          display_language: displayLanguage,
          meaning: item.meaning,
          part_of_speech: item.partOfSpeech,
          note: item.note,
        },
      ];
    });
    if (rows.length === 0) continue;

    // Another request may have cached some of these meanwhile; keep the first answer
    const { error: writeError } = await adminClient.from("word_explanations").upsert(rows, {
      onConflict: "language,term,reading,display_language",
      ignoreDuplicates: true,
    });
    if (writeError) throw new WarmVocabularyError("INTERNAL");
    explained += rows.length;
  }

  return { explained, pending: Math.max(missing.length - explained, 0), limited };
}
