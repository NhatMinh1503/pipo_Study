import type { NextRequest } from "next/server";

import { battleAnswerRequestSchema } from "@/lib/schemas/battle";
import { createClient } from "@/lib/supabase/server";
import { getGrader } from "@/server/ai/grader";
import { getSessionUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { jsonError, jsonOk } from "@/server/http";
import { logger } from "@/server/logger";
import { BattleError, submitBattleAnswer } from "@/server/services/battle-answer";
import { createAdminClient } from "@/server/supabase-admin";

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "/api/battles/answer", requestId: crypto.randomUUID() });
  const started = performance.now();

  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const body = battleAnswerRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("VALIDATION_ERROR");

  try {
    const result = await submitBattleAnswer({
      userClient: await createClient(),
      adminClient: createAdminClient(),
      userId: user.id,
      ...body.data,
      grade: getGrader(),
      dailyLimit: getServerEnv().AI_DAILY_LIMIT,
    });
    log.info("battle answer graded", {
      verdict: result.verdict,
      latencyMs: Math.round(performance.now() - started),
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof BattleError && error.code !== "INTERNAL") return jsonError(error.code);
    if (error instanceof AiError) {
      log.warn("grading unavailable", { code: error.code });
      return jsonError(error.code);
    }
    log.error("battle answer failed", { err: error });
    return jsonError("INTERNAL");
  }
}
