import "server-only";

import { getServerEnv } from "@/server/env";
import { generateWithFallback } from "@/server/ai/llm";
import {
  buildRewriteNewsPrompt,
  PROMPT_VERSION,
  rewrittenNewsSchema,
  SYSTEM_INSTRUCTION,
  type RewriteNewsInput,
  type RewrittenNews,
} from "@/server/prompts/rewrite-news.v1";

export type NewsRewriter = ((input: RewriteNewsInput) => Promise<RewrittenNews>) & {
  /** Fake rewrites must never be cached for real use. */
  cacheable: boolean;
};

export const geminiNewsRewriter: NewsRewriter = Object.assign(
  async (input: RewriteNewsInput) => {
    const { data } = await generateWithFallback({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt: buildRewriteNewsPrompt(input),
      schema: rewrittenNewsSchema,
      promptVersion: PROMPT_VERSION,
    });
    return data;
  },
  { cacheable: true },
);

/** Deterministic rewriter for automated tests only (AI_PROVIDER=fake, never in production). */
export const fakeNewsRewriter: NewsRewriter = Object.assign(
  async (input: RewriteNewsInput) =>
    input.language === "ja"
      ? {
          title: "総理のニュース",
          sentences: ["総理はお客さんに会いました。", "二人は話しました。", "いい日でした。"],
        }
      : {
          title: "News from the UK",
          sentences: [
            "The government shared some news.",
            "Many people read it.",
            "It was a good day.",
          ],
        },
  { cacheable: false },
);

export function getNewsRewriter(): NewsRewriter {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeNewsRewriter : geminiNewsRewriter;
}
