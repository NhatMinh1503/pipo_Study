import "server-only";

import { getServerEnv } from "@/server/env";
import { generateStructured } from "@/server/gemini";
import {
  buildSelectClozePrompt,
  PROMPT_VERSION,
  selectClozeResponseSchema,
  SYSTEM_INSTRUCTION,
  type SelectClozeInput,
  type SelectClozeResponse,
} from "@/server/prompts/select-cloze.v1";

export type ClozeSelector = ((input: SelectClozeInput) => Promise<SelectClozeResponse>) & {
  /** Fake choices must never be cached for real use. */
  cacheable: boolean;
};

export const geminiClozeSelector: ClozeSelector = Object.assign(
  async (input: SelectClozeInput) => {
    const env = getServerEnv();
    const { data } = await generateStructured({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt: buildSelectClozePrompt(input),
      schema: selectClozeResponseSchema,
      promptVersion: PROMPT_VERSION,
    });
    return data;
  },
  { cacheable: true },
);

/** Deterministic selector for automated tests only: the first noun of each sentence. */
export const fakeClozeSelector: ClozeSelector = Object.assign(
  async (input: SelectClozeInput) => ({
    blanks: input.sentences.flatMap((sentence, sentenceIndex) => {
      const token = sentence.tokens.findIndex(
        (candidate) => candidate.isWord && candidate.pos === "noun",
      );
      return token === -1 ? [] : [{ sentence: sentenceIndex, token }];
    }),
  }),
  { cacheable: false },
);

export function getClozeSelector(): ClozeSelector {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeClozeSelector : geminiClozeSelector;
}
