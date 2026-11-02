import { z } from "zod";

import type { Token } from "@/lib/nlp/token";

export const MAX_BLANKS_PER_SENTENCE = 2;

export const blankSchema = z.object({ sentenceId: z.uuid(), tokenIndex: z.number().int().min(0) });
export type Blank = z.infer<typeof blankSchema>;
export const blanksSchema = z.array(blankSchema);

export interface TokenizedSentence {
  id: string;
  tokens: Token[];
}

/**
 * Keeps only blanks that point at a real word in a real sentence, without duplicates,
 * at most two per sentence — the AI's choice is a suggestion, never trusted as-is.
 */
export function sanitizeBlanks(
  sentences: readonly TokenizedSentence[],
  blanks: readonly Blank[],
): Blank[] {
  const byId = new Map(sentences.map((sentence) => [sentence.id, sentence.tokens]));
  const perSentence = new Map<string, Set<number>>();

  for (const blank of blanks) {
    const token = byId.get(blank.sentenceId)?.[blank.tokenIndex];
    if (!token?.isWord || token.pos === "particle" || token.pos === "auxiliary") continue;
    const chosen = perSentence.get(blank.sentenceId) ?? new Set<number>();
    if (chosen.size >= MAX_BLANKS_PER_SENTENCE) continue;
    chosen.add(blank.tokenIndex);
    perSentence.set(blank.sentenceId, chosen);
  }

  // Keep the sentence order of the lesson and token order within each sentence
  return sentences.flatMap((sentence) =>
    [...(perSentence.get(sentence.id) ?? [])]
      .sort((a, b) => a - b)
      .map((tokenIndex) => ({ sentenceId: sentence.id, tokenIndex })),
  );
}
