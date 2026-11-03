import "server-only";

import type { z } from "zod";

import { getServerEnv, type ServerEnv } from "@/server/env";
import { AiError, generateStructured, type GeminiResult } from "@/server/gemini";
import { generateStructuredGroq } from "@/server/groq";
import { logger } from "@/server/logger";

export type AiProvider = "gemini" | "groq";

export interface LlmRequest<T> {
  systemInstruction: string;
  prompt: string;
  schema: z.ZodType<T>;
  promptVersion: string;
  temperature?: number;
}

export interface LlmResult<T> extends GeminiResult<T> {
  provider: AiProvider;
}

type Call = <T>(
  provider: AiProvider,
  request: LlmRequest<T>,
  budget: { timeoutMs: number; maxRetries: number },
) => Promise<GeminiResult<T>>;

const callProvider: Call = (provider, request, budget) => {
  const env = getServerEnv();
  return provider === "gemini"
    ? generateStructured(
        { ...request, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
        budget,
      )
    : generateStructuredGroq(
        { ...request, apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL },
        budget,
      );
};

/** Providers with a key, primary first. */
export function providerOrder(
  env: Pick<ServerEnv, "AI_PRIMARY" | "GEMINI_API_KEY" | "GROQ_API_KEY">,
): AiProvider[] {
  const configured = { gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY) };
  const order: AiProvider[] = env.AI_PRIMARY === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
  return order.filter((provider) => configured[provider]);
}

/**
 * Structured AI call with failover: the primary provider gets a short budget so a congested
 * free tier costs the learner a few seconds, not thirty; the next provider then answers.
 * Bad requests (wrong key/model) also fall through, so one broken provider never blocks AI.
 */
export async function generateWithFallback<T>(
  request: LlmRequest<T>,
  deps: { env?: Parameters<typeof providerOrder>[0]; call?: Call } = {},
): Promise<LlmResult<T>> {
  const order = providerOrder(deps.env ?? getServerEnv());
  const call = deps.call ?? callProvider;
  if (order.length === 0) throw new AiError("AI_NOT_CONFIGURED", "No AI provider key is set");

  let lastError: unknown;
  for (const [index, provider] of order.entries()) {
    const isLast = index === order.length - 1;
    // With a fallback waiting, fail fast; the last provider gets the full budget
    const budget = isLast
      ? { timeoutMs: 9_000, maxRetries: 1 }
      : { timeoutMs: 4_000, maxRetries: 0 };
    try {
      const result = await call(provider, request, budget);
      return { ...result, provider };
    } catch (error) {
      lastError = error;
      if (!isLast) {
        logger.warn("ai provider failed over", {
          module: "llm",
          provider,
          promptVersion: request.promptVersion,
          code: error instanceof AiError ? error.code : "INTERNAL",
        });
      }
    }
  }
  throw lastError instanceof AiError
    ? lastError
    : new AiError("AI_UNAVAILABLE", "No AI provider answered");
}
