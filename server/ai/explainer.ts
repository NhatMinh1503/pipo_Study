import "server-only";

import { getServerEnv } from "@/server/env";
import { generateWithFallback } from "@/server/ai/llm";
import {
  buildExplainWordsPrompt,
  explainWordsResponseSchema,
  PROMPT_VERSION as BATCH_PROMPT_VERSION,
  SYSTEM_INSTRUCTION as BATCH_SYSTEM_INSTRUCTION,
  type ExplainWordsInput,
  type ExplainWordsResponse,
} from "@/server/prompts/explain-words.v1";
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
    const { data } = await generateWithFallback({
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

export type BatchExplainer = ((input: ExplainWordsInput) => Promise<ExplainWordsResponse>) & {
  cacheable: boolean;
};

// Runs in the background while the learner reads, so it may take longer than a popup click
const BATCH_BUDGETS = {
  failover: { timeoutMs: 15_000, maxRetries: 0 },
  last: { timeoutMs: 25_000, maxRetries: 1 },
};

export const geminiBatchExplainer: BatchExplainer = Object.assign(
  async (input: ExplainWordsInput) => {
    const { data } = await generateWithFallback(
      {
        systemInstruction: BATCH_SYSTEM_INSTRUCTION,
        prompt: buildExplainWordsPrompt(input),
        schema: explainWordsResponseSchema,
        promptVersion: BATCH_PROMPT_VERSION,
      },
      { budgets: BATCH_BUDGETS },
    );
    return data;
  },
  { cacheable: true },
);

/** Deterministic batch explainer for automated tests only; never written to the cache. */
export const fakeBatchExplainer: BatchExplainer = Object.assign(
  async (input: ExplainWordsInput) => ({
    words: input.words.map((word) => ({
      term: word.term,
      meaning: `nghĩa của ${word.term}`,
      partOfSpeech: null,
      note: "fake",
    })),
  }),
  { cacheable: false },
);

export function getBatchExplainer(): BatchExplainer {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeBatchExplainer : geminiBatchExplainer;
}
