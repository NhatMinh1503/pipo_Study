import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SUPABASE_SECRET_KEY: z.string().min(1),
  // Optional so the app runs without AI; AI routes answer AI_NOT_CONFIGURED instead
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
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
