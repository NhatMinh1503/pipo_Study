import type { NextRequest } from "next/server";

import { findOpenSource } from "@/lib/news/open-sources";
import { isLevelForLanguage, LEVELS_BY_LANGUAGE } from "@/lib/schemas/common";
import { newsRewriteRequestSchema } from "@/lib/schemas/news";
import { createClient } from "@/lib/supabase/server";
import { getNewsRewriter } from "@/server/ai/news-rewriter";
import { getSessionUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { jsonError, jsonOk } from "@/server/http";
import { logger } from "@/server/logger";
import { getCurrentProfile } from "@/server/profile";
import { getOpenArticle } from "@/server/queries/open-news";
import { NewsRewriteError, rewriteNewsForLesson } from "@/server/services/news-rewrite";
import { createAdminClient } from "@/server/supabase-admin";

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "/api/news/rewrite", requestId: crypto.randomUUID() });
  const started = performance.now();

  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const body = newsRewriteRequestSchema.safeParse(await request.json().catch(() => null));
  const source = body.success ? findOpenSource(body.data.url) : null;
  if (!body.success || !source) return jsonError("VALIDATION_ERROR");

  // Write at the learner's own level when they study this language; otherwise its easiest level
  const profile = await getCurrentProfile();
  const level =
    profile?.level && isLevelForLanguage(source.language, profile.level)
      ? profile.level
      : LEVELS_BY_LANGUAGE[source.language][0];

  try {
    const result = await rewriteNewsForLesson({
      userClient: await createClient(),
      adminClient: createAdminClient(),
      url: body.data.url,
      level,
      rewrite: getNewsRewriter(),
      fetchArticle: getOpenArticle,
      dailyLimit: getServerEnv().AI_DAILY_LIMIT,
    });
    log.info("news rewritten", {
      source: source.id,
      level,
      latencyMs: Math.round(performance.now() - started),
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof NewsRewriteError && error.code !== "INTERNAL")
      return jsonError(error.code);
    if (error instanceof AiError) {
      log.warn("rewrite unavailable", { code: error.code });
      return jsonError(error.code);
    }
    log.error("rewrite failed", { err: error });
    return jsonError("INTERNAL");
  }
}
