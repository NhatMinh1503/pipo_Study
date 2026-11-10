import type { NextRequest } from "next/server";

import { explainWordRequestSchema } from "@/lib/schemas/dictionary";
import { createClient } from "@/lib/supabase/server";
import { getExplainer } from "@/server/ai/explainer";
import { getSessionUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { jsonError, jsonOk } from "@/server/http";
import { logger } from "@/server/logger";
import { DictionaryError, explainWord } from "@/server/services/dictionary";
import { createAdminClient } from "@/server/supabase-admin";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

/** POST /api/dictionary/explain — AI explanation in the user's display language (cached). */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const body = explainWordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("VALIDATION_ERROR");

  const userClient = await createClient();
  const { data: profile } = await userClient
    .from("profiles")
    .select("display_language")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const explanation = await explainWord({
      userClient,
      adminClient: createAdminClient(),
      input: { ...body.data, displayLanguage: profile?.display_language ?? DEFAULT_LOCALE },
      explain: getExplainer(),
      dailyLimit: getServerEnv().AI_DAILY_LIMIT,
    });
    return jsonOk(explanation);
  } catch (error) {
    if (error instanceof DictionaryError && error.code === "RATE_LIMITED") {
      return jsonError("RATE_LIMITED");
    }
    if (error instanceof AiError) return jsonError(error.code);
    logger.error("explain word failed", { route: "/api/dictionary/explain", err: error });
    return jsonError("INTERNAL");
  }
}
