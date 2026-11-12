import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ENGLISH_INFLECTIONS,
  orderEnglishEntries,
  type EnglishInflection,
} from "@/lib/dictionary/english";
import type { DisplayLanguage, LearningLanguage } from "@/lib/schemas/common";
import {
  dictionaryEntrySchema,
  englishEntrySchema,
  type DictionaryEntry,
  type EnglishEntry,
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

const MAX_ENGLISH_ENTRIES = 2;
const isInflection = (kind: string): kind is EnglishInflection =>
  ENGLISH_INFLECTIONS.some((known) => known === kind);

export interface EnglishLookup {
  entries: EnglishEntry[];
  /** IPA of the clicked word itself, from its own entry or from its inflected-form row. */
  ipa: string | null;
}

/**
 * Offline English lookup: the clicked word itself plus the lemma(s) it is a form of
 * (`went` → go, `running` → run and running), more common entry first.
 */
export async function lookupEnglishEntries(client: Client, term: string): Promise<EnglishLookup> {
  const word = term.trim().toLowerCase().replaceAll("’", "'");
  const { data: forms } = await client
    .from("english_forms")
    .select("lemma, kind, ipa")
    .eq("form", word)
    .limit(10);

  const kindByLemma = new Map<string, EnglishInflection>();
  for (const form of forms ?? []) {
    if (form.lemma !== word && !kindByLemma.has(form.lemma) && isInflection(form.kind)) {
      kindByLemma.set(form.lemma, form.kind);
    }
  }

  const { data: rows } = await client
    .from("english_entries")
    .select("word, ipa, senses, rank, oxford")
    .in("word", [word, ...kindByLemma.keys()]);

  const entries = (rows ?? []).flatMap((row) => {
    const parsed = englishEntrySchema.safeParse({
      word: row.word,
      ipa: row.ipa,
      senses: row.senses,
      oxford: row.oxford,
      inflection: row.word === word ? null : (kindByLemma.get(row.word) ?? null),
    });
    return parsed.success ? [{ ...parsed.data, rank: row.rank }] : [];
  });

  const ordered = orderEnglishEntries(word, entries)
    .slice(0, MAX_ENGLISH_ENTRIES)
    .map((entry) => englishEntrySchema.parse(entry));
  const own = entries.find((entry) => entry.word === word)?.ipa;
  const formIpa = (forms ?? []).find((form) => form.ipa)?.ipa;
  return { entries: ordered, ipa: own ?? formIpa ?? null };
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
