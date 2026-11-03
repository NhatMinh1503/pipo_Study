import type { NextRequest } from "next/server";

import { verifyTranslationRequestSchema } from "@/lib/schemas/translation";
import { createClient } from "@/lib/supabase/server";
import { getGrader } from "@/server/ai/grader";
import { getSessionUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { jsonError, jsonOk } from "@/server/http";
import { logger } from "@/server/logger";
import { ServiceError, verifyTranslation } from "@/server/services/verify-translation";
import { createAdminClient } from "@/server/supabase-admin";

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "/api/translations/verify", requestId: crypto.randomUUID() });
  const started = performance.now();

  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const body = verifyTranslationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("VALIDATION_ERROR");

  try {
    const result = await verifyTranslation({
      userClient: await createClient(),
      adminClient: createAdminClient(),
      userId: user.id,
      sentenceId: body.data.sentenceId,
      userTranslation: body.data.userTranslation,
      grade: getGrader(),
      dailyLimit: getServerEnv().AI_DAILY_LIMIT,
    });
    log.info("translation graded", {
      verdict: result.verdict,
      latencyMs: Math.round(performance.now() - started),
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ServiceError && error.code !== "INTERNAL") return jsonError(error.code);
    if (error instanceof AiError) {
      log.warn("grading unavailable", { code: error.code });
      return jsonError(error.code);
    }
    log.error("grading failed", { err: error });
    return jsonError("INTERNAL");
  }
}
