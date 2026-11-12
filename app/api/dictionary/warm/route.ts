import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { warmVocabularyRequestSchema } from "@/lib/schemas/dictionary";
import { createClient } from "@/lib/supabase/server";
import { getBatchExplainer } from "@/server/ai/explainer";
import { getSessionUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { jsonError, jsonOk } from "@/server/http";
import { logger } from "@/server/logger";
import { warmLessonVocabulary, WarmVocabularyError } from "@/server/services/warm-vocabulary";
import { createAdminClient } from "@/server/supabase-admin";

/**
 * POST /api/dictionary/warm — explains a lesson's uncached words in the learner's display
 * language ahead of time, so word popups show a meaning without a click on "Explain".
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const body = warmVocabularyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("VALIDATION_ERROR");

  const userClient = await createClient();
  const { data: profile } = await userClient
    .from("profiles")
    .select("display_language")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const result = await warmLessonVocabulary({
      userClient,
      adminClient: createAdminClient(),
      lessonId: body.data.lessonId,
      displayLanguage: profile?.display_language ?? DEFAULT_LOCALE,
      explainBatch: getBatchExplainer(),
      dailyLimit: getServerEnv().AI_DAILY_LIMIT,
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof WarmVocabularyError && error.code === "NOT_FOUND") {
      return jsonError("NOT_FOUND");
    }
    logger.error("warm vocabulary failed", { route: "/api/dictionary/warm", err: error });
    return jsonError("INTERNAL");
  }
}
