import "server-only";

import { z } from "zod";

import { AiError, type FetchFn, type GeminiResult } from "./gemini";
import { logger } from "./logger";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqRequest<T> {
  apiKey: string | undefined;
  model: string;
  systemInstruction: string;
  prompt: string;
  /** Zod schema of the expected JSON; sent as JSON Schema and used to validate the reply. */
  schema: z.ZodType<T>;
  promptVersion: string;
  temperature?: number;
}

export interface GroqDeps {
  fetch?: FetchFn;
  timeoutMs?: number;
  maxRetries?: number;
}

const chatResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional() }) })),
});

class RetryableError extends Error {}

/**
 * Same contract as Gemini's generateStructured, over Groq's OpenAI-compatible API:
 * JSON-schema response format, Zod validation, retry on network errors, timeouts, 429, 5xx
 * and invalid JSON. Throws AiError when it gives up.
 */
export async function generateStructuredGroq<T>(
  request: GroqRequest<T>,
  deps: GroqDeps = {},
): Promise<GeminiResult<T>> {
  const { fetch: fetchImpl = fetch, timeoutMs = 8_000, maxRetries = 1 } = deps;
  if (!request.apiKey) throw new AiError("AI_NOT_CONFIGURED", "GROQ_API_KEY is not set");

  const log = logger.child({
    module: "groq",
    model: request.model,
    promptVersion: request.promptVersion,
  });
  const body = JSON.stringify({
    model: request.model,
    temperature: request.temperature ?? 0.2,
    messages: [
      { role: "system", content: request.systemInstruction },
      { role: "user", content: request.prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "answer",
        // Non-strict: Zod still validates every reply, and strict mode rejects some valid schemas
        strict: false,
        schema: z.toJSONSchema(request.schema, { target: "draft-7" }),
      },
    },
  });

  const started = performance.now();
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const data = await callOnce();
      const latencyMs = Math.round(performance.now() - started);
      log.info("groq call succeeded", { attempt, latencyMs, outcome: "ok" });
      return { data, attempts: attempt, latencyMs };
    } catch (error) {
      if (!(error instanceof RetryableError)) throw error;
      log.warn("groq call failed", { attempt, reason: error.message });
    }
  }
  throw new AiError("AI_UNAVAILABLE", "Groq did not return a valid answer");

  async function callOnce(): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey ?? ""}`,
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new RetryableError(error instanceof Error ? error.name : "network");
    }
    if (response.status === 429 || response.status >= 500)
      throw new RetryableError(`http ${response.status}`);
    if (!response.ok)
      throw new AiError("AI_BAD_REQUEST", `Groq rejected the request (${response.status})`);

    const parsed = chatResponse.safeParse(await response.json());
    const text = parsed.success ? parsed.data.choices[0]?.message.content : undefined;
    if (!text) throw new RetryableError("empty reply");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new RetryableError("reply is not JSON");
    }
    const result = request.schema.safeParse(json);
    if (!result.success) throw new RetryableError("reply does not match schema");
    return result.data;
  }
}
