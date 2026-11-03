import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Grader } from "@/server/ai/grader";
import { logger } from "@/server/logger";
import {
  gradeResponseSchema,
  PROMPT_VERSION,
  type GradeInput,
  type GradeResponse,
} from "@/server/prompts/grade-translation.v1";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const log = logger.child({ module: "grading-cache" });

/** Only whitespace and Unicode form are normalised: wording and punctuation can change a verdict. */
const normalize = (text: string | null) =>
  (text ?? "").normalize("NFC").trim().replace(/\s+/g, " ");

/**
 * Hash of everything the grade depends on, including the prompt version so a new prompt
 * never serves verdicts from the old one. No user data is part of the key.
 */
export function gradingCacheKey(input: GradeInput): string {
  const parts = [
    PROMPT_VERSION,
    input.sourceLanguage,
    input.level,
    input.targetLanguage,
    normalize(input.source),
    normalize(input.userTranslation),
    normalize(input.referenceTranslation),
    normalize(input.contextBefore),
    normalize(input.contextAfter),
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** A verdict given earlier for exactly this input, or null. Cache trouble never blocks grading. */
export async function readCachedGrade(
  adminClient: Client,
  input: GradeInput,
): Promise<GradeResponse | null> {
  const { data, error } = await adminClient
    .from("grading_cache")
    .select("result")
    .eq("cache_key", gradingCacheKey(input))
    .maybeSingle();
  if (error) {
    log.warn("cache read failed", { code: error.code });
    return null;
  }
  const parsed = gradeResponseSchema.safeParse(data?.result);
  return parsed.success ? parsed.data : null;
}

/** Remembers a real AI verdict for the next learner who writes the same translation. */
export async function storeGrade(
  adminClient: Client,
  grade: Grader,
  input: GradeInput,
  result: GradeResponse,
): Promise<void> {
  if (!grade.cacheable) return;
  const { error } = await adminClient
    .from("grading_cache")
    .upsert(
      { cache_key: gradingCacheKey(input), prompt_version: PROMPT_VERSION, result },
      { onConflict: "cache_key", ignoreDuplicates: true },
    );
  if (error) log.warn("cache write failed", { code: error.code });
}
