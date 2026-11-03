import "server-only";

import { z } from "zod";

import { logger } from "./logger";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type AiErrorCode = "AI_NOT_CONFIGURED" | "AI_UNAVAILABLE" | "AI_BAD_REQUEST";

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface GeminiRequest<T> {
  apiKey: string | undefined;
  model: string;
  systemInstruction: string;
  prompt: string;
  /** Zod schema of the expected JSON; sent as JSON Schema and used to validate the reply. */
  schema: z.ZodType<T>;
  /** Tag for logs, e.g. "grade-translation.v1". */
  promptVersion: string;
  temperature?: number;
}

/** The subset of `fetch` this module needs; easy to fake in tests. */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export interface GeminiDeps {
  fetch?: FetchFn;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GeminiResult<T> {
  data: T;
  attempts: number;
  latencyMs: number;
}

const generateContentResponse = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }).optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
});

class RetryableError extends Error {}

/**
 * Calls Gemini generateContent with structured JSON output and validates the reply.
 * Retries (exponential backoff + jitter) on network errors, timeouts, 429, 5xx and
 * replies that do not match `schema`. Throws AiError when it finally gives up.
 */
export async function generateStructured<T>(
  request: GeminiRequest<T>,
  deps: GeminiDeps = {},
): Promise<GeminiResult<T>> {
  const {
    fetch: fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random = Math.random,
    timeoutMs = 10_000,
    maxRetries = 2,
  } = deps;

  if (!request.apiKey) throw new AiError("AI_NOT_CONFIGURED", "GEMINI_API_KEY is not set");

  const log = logger.child({
    module: "gemini",
    model: request.model,
    promptVersion: request.promptVersion,
  });
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: request.prompt }] }],
    generationConfig: {
      temperature: request.temperature ?? 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(request.schema, { target: "draft-7" }),
    },
  });

  const started = performance.now();

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const data = await callOnce(fetchImpl, request, body, timeoutMs);
      const latencyMs = Math.round(performance.now() - started);
      log.info("gemini call succeeded", { attempt, latencyMs, outcome: "ok" });
      return { data, attempts: attempt, latencyMs };
    } catch (error) {
      if (!(error instanceof RetryableError)) throw error;

      log.warn("gemini call failed", { attempt, reason: error.message });
      if (attempt > maxRetries) break;
      const backoff = 500 * 2 ** (attempt - 1);
      await sleep(backoff + Math.round(random() * 250));
    }
  }

  throw new AiError("AI_UNAVAILABLE", "Gemini did not return a valid answer");

  async function callOnce(
    doFetch: FetchFn,
    req: GeminiRequest<T>,
    payload: string,
    timeout: number,
  ): Promise<T> {
    let response: Response;
    try {
      response = await doFetch(`${API_BASE}/${encodeURIComponent(req.model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": req.apiKey ?? "" },
        body: payload,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error) {
      throw new RetryableError(error instanceof Error ? error.name : "network");
    }

    if (response.status === 429 || response.status >= 500) {
      throw new RetryableError(`http ${response.status}`);
    }
    if (!response.ok) {
      // 400/401/403/404: retrying will not help (bad key, bad model name, bad request)
      throw new AiError("AI_BAD_REQUEST", `Gemini rejected the request (${response.status})`);
    }

    const parsed = generateContentResponse.safeParse(await response.json());
    const text = parsed.success
      ? parsed.data.candidates?.[0]?.content?.parts.map((part) => part.text ?? "").join("")
      : undefined;
    if (!text) throw new RetryableError("empty reply");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new RetryableError("reply is not JSON");
    }

    const result = req.schema.safeParse(json);
    if (!result.success) throw new RetryableError("reply does not match schema");
    return result.data;
  }
}
