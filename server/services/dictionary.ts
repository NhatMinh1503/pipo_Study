import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DisplayLanguage, LearningLanguage } from "@/lib/schemas/common";
import {
  dictionaryEntrySchema,
  type DictionaryEntry,
  type WordExplanation,
} from "@/lib/schemas/dictionary";
import type { Explainer } from "@/server/ai/explainer";
import type { ExplainInput } from "@/server/prompts/explain-word.v1";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class DictionaryError extends Error {
  constructor(readonly code: "RATE_LIMITED" | "INTERNAL") {
    super(code);
  }
}

/** Offline JMdict lookup for a Japanese word by dictionary form, then by reading. */
export async function lookupEntries(
  client: Client,
  term: string,
  reading: string,
  language: LearningLanguage,
): Promise<DictionaryEntry[]> {
  // JMdict is Japanese → English only; English words rely on the AI explanation
  if (language !== "ja") return [];

  // Two parameterized queries instead of a hand-built `.or()` filter string, so user
  // input can never alter the filter syntax
  const select = "id, kanji, kana, senses, common";
  const [byKanji, byKana] = await Promise.all([
    client.from("dictionary_entries").select(select).contains("kanji", [term]).limit(5),
    client.from("dictionary_entries").select(select).contains("kana", [term]).limit(5),
  ]);

  const unique = new Map<string, NonNullable<typeof byKanji.data>[number]>();
  for (const row of [...(byKanji.data ?? []), ...(byKana.data ?? [])]) unique.set(row.id, row);

  const entries = [...unique.values()]
    .sort((a, b) => Number(b.common) - Number(a.common))
    .map((row) => ({
      id: row.id,
      kanji: row.kanji,
      kana: row.kana,
      senses: dictionaryEntrySchema.shape.senses.safeParse(row.senses).data ?? [],
    }));

  // Prefer the entry whose reading matches the tokenizer's reading (e.g. 生 = なま vs せい)
  return entries
    .sort((a, b) => Number(b.kana.includes(reading)) - Number(a.kana.includes(reading)))
    .slice(0, 3);
}

export async function getCachedExplanation(
  client: Client,
  key: {
    term: string;
    reading: string;
    language: LearningLanguage;
    displayLanguage: DisplayLanguage;
  },
): Promise<WordExplanation | null> {
  const { data } = await client
    .from("word_explanations")
    .select("meaning, part_of_speech, note")
    .eq("language", key.language)
    .eq("term", key.term)
    .eq("reading", key.reading)
    .eq("display_language", key.displayLanguage)
    .maybeSingle();
  return data
    ? { meaning: data.meaning, partOfSpeech: data.part_of_speech, note: data.note }
    : null;
}

interface ExplainParams {
  userClient: Client;
  adminClient: Client;
  input: ExplainInput;
  explain: Explainer;
  dailyLimit: number;
}

/**
 * Returns the cached explanation or asks Gemini once and caches it for everyone.
 * Only cache misses count against the user's daily AI quota.
 */
export async function explainWord({
  userClient,
  adminClient,
  input,
  explain,
  dailyLimit,
}: ExplainParams): Promise<WordExplanation> {
  const cached = await getCachedExplanation(userClient, input);
  if (cached) return cached;

  const { data: allowed, error } = await userClient.rpc("rate_limit_hit", {
    p_key: "ai",
    p_limit: dailyLimit,
  });
  if (error) throw new DictionaryError("INTERNAL");
  if (!allowed) throw new DictionaryError("RATE_LIMITED");

  const data = await explain(input);

  if (!explain.cacheable) return data;

  // Another request may have cached it meanwhile; keep the first one
  await adminClient.from("word_explanations").upsert(
    {
      language: input.language,
      term: input.term,
      reading: input.reading,
      display_language: input.displayLanguage,
      meaning: data.meaning,
      part_of_speech: data.partOfSpeech,
      note: data.note,
    },
    { onConflict: "language,term,reading,display_language", ignoreDuplicates: true },
  );

  return data;
}
