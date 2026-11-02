import "server-only";

import { getServerEnv } from "@/server/env";
import { generateStructured } from "@/server/gemini";
import {
  buildExplainPrompt,
  explainResponseSchema,
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  type ExplainInput,
  type ExplainResponse,
} from "@/server/prompts/explain-word.v1";

export type Explainer = ((input: ExplainInput) => Promise<ExplainResponse>) & {
  /** Fake answers must never reach the shared cache that real users read. */
  cacheable: boolean;
};

export const geminiExplainer: Explainer = Object.assign(
  async (input: ExplainInput) => {
    const env = getServerEnv();
    const { data } = await generateStructured({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt: buildExplainPrompt(input),
      schema: explainResponseSchema,
      promptVersion: PROMPT_VERSION,
    });
    return data;
  },
  { cacheable: true },
);

/** Deterministic explainer for automated tests only (AI_PROVIDER=fake, never in production). */
export const fakeExplainer: Explainer = Object.assign(
  async (input: ExplainInput) => ({
    meaning: `nghĩa của ${input.term}`,
    partOfSpeech: null,
    note: "fake",
  }),
  { cacheable: false },
);

export function getExplainer(): Explainer {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeExplainer : geminiExplainer;
}
