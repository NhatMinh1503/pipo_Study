import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { blanksSchema, sanitizeBlanks, type Blank } from "@/lib/cloze/blanks";
import type { LessonWorkspace } from "@/lib/lessons/workspace";
import type { ProficiencyLevel } from "@/lib/schemas/common";
import type { ClozeSelector } from "@/server/ai/cloze-selector";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class ClozeError extends Error {
  constructor(readonly code: "RATE_LIMITED" | "INTERNAL") {
    super(code);
  }
}

interface ClozeParams {
  userClient: Client;
  adminClient: Client;
  userId: string;
  workspace: LessonWorkspace;
  level: ProficiencyLevel;
  select: ClozeSelector;
  dailyLimit: number;
}

/** Cached blanks for (lesson, level), or asks the AI once and stores the sanitized result. */
export async function getClozeBlanks(params: ClozeParams): Promise<Blank[]> {
  const { userClient, adminClient, userId, workspace, level, select, dailyLimit } = params;
  const sentences = workspace.sentences.map((sentence) => ({
    id: sentence.id,
    tokens: sentence.tokens ?? [],
  }));

  const { data: cached } = await userClient
    .from("cloze_sets")
    .select("blanks")
    .eq("lesson_id", workspace.id)
    .eq("level", level)
    .maybeSingle();
  const parsed = blanksSchema.safeParse(cached?.blanks);
  if (cached && parsed.success) return sanitizeBlanks(sentences, parsed.data);

  const { data: allowed, error } = await userClient.rpc("rate_limit_hit", {
    p_key: "ai",
    p_limit: dailyLimit,
  });
  if (error) throw new ClozeError("INTERNAL");
  if (!allowed) throw new ClozeError("RATE_LIMITED");

  const result = await select({ language: workspace.language, level, sentences });
  const blanks = sanitizeBlanks(
    sentences,
    result.blanks.flatMap(({ sentence, token }) => {
      const id = sentences[sentence]?.id;
      return id ? [{ sentenceId: id, tokenIndex: token }] : [];
    }),
  );

  if (select.cacheable) {
    await adminClient
      .from("cloze_sets")
      .upsert(
        { user_id: userId, lesson_id: workspace.id, level, blanks },
        { onConflict: "lesson_id,level" },
      );
  }
  return blanks;
}
