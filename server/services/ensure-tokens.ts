import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LessonWorkspace } from "@/lib/lessons/workspace";
import { tokenizeSentence } from "@/server/nlp/tokenize";
import type { Database } from "@/types/database";

/**
 * Tokenizes sentences that have no tokens yet (new or older lessons) and stores them,
 * so each sentence is tokenized once on the server and the browser never loads a tokenizer.
 */
export async function ensureTokens(
  client: SupabaseClient<Database>,
  workspace: LessonWorkspace,
): Promise<LessonWorkspace> {
  const missing = workspace.sentences.filter((sentence) => sentence.tokens === null);
  if (missing.length === 0) return workspace;

  const tokenized = await Promise.all(
    missing.map(async (sentence) => ({
      id: sentence.id,
      tokens: await tokenizeSentence(sentence.sourceText, workspace.language),
    })),
  );

  // Owners may update their own sentences (RLS); a failed write only means we retokenize later
  await Promise.all(
    tokenized.map(({ id, tokens }) => client.from("sentences").update({ tokens }).eq("id", id)),
  );

  const byId = new Map(tokenized.map(({ id, tokens }) => [id, tokens]));
  return {
    ...workspace,
    sentences: workspace.sentences.map((sentence) => ({
      ...sentence,
      tokens: sentence.tokens ?? byId.get(sentence.id) ?? null,
    })),
  };
}
