import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SUPABASE_SECRET_KEY: z.string().min(1),
  // Optional so the app runs without AI; AI routes answer AI_NOT_CONFIGURED instead
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  // Groq answers first: qwen3.8-27b matched Gemini on the grading fixtures (10/11) at
  // ~0.5 s vs ~16 s on a congested Gemini free tier (ai:eval, 2026-11-03). Without a Groq
  // key, Gemini alone is used.
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default("qwen/qwen3.8-27b"),
  AI_PRIMARY: z.enum(["gemini", "groq"]).default("groq"),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(150),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/**
 * Secret, server-only environment variables. Parsed lazily so a missing key fails
 * on first use with a clear message instead of crashing unrelated imports.
 */
export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse(process.env);
  return cachedEnv;
}
