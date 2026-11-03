import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { attributionFor, findOpenSource } from "@/lib/news/open-sources";
import { copiesSource } from "@/lib/news/verbatim";
import type { ProficiencyLevel } from "@/lib/schemas/common";
import type { NewsRewriteResponse } from "@/lib/schemas/news";
import type { NewsRewriter } from "@/server/ai/news-rewriter";
import { PROMPT_VERSION } from "@/server/prompts/rewrite-news.v1";
import type { OpenArticle } from "@/server/queries/open-news";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class NewsRewriteError extends Error {
  constructor(readonly code: "NOT_FOUND" | "RATE_LIMITED" | "AI_BAD_REQUEST" | "INTERNAL") {
    super(code);
  }
}

export interface RewriteNewsParams {
  /** Acts as the learner, for the daily AI quota. */
  userClient: Client;
  /** Reads and fills the shared rewrite cache. */
  adminClient: Client;
  url: string;
  level: ProficiencyLevel;
  rewrite: NewsRewriter;
  fetchArticle: (url: string) => Promise<OpenArticle>;
  dailyLimit: number;
}

/**
 * A learner-level passage written from an openly licensed article. Shared per (article, level)
 * so each one costs a single AI call; drafts that copy the source word for word are rejected.
 */
export async function rewriteNewsForLesson(
  params: RewriteNewsParams,
): Promise<NewsRewriteResponse> {
  const { userClient, adminClient, url, level, rewrite } = params;
  const source = findOpenSource(url);
  if (!source) throw new NewsRewriteError("NOT_FOUND");

  const respond = (title: string, passage: string, originalTitle: string): NewsRewriteResponse => ({
    title,
    passage,
    source: {
      name: source.name,
      url,
      license: source.license,
      licenseUrl: source.licenseUrl,
      attribution: attributionFor(source, originalTitle, url),
    },
  });

  const article = await params.fetchArticle(url).catch(() => null);
  if (!article || `${article.title}${article.text}`.trim().length < 10) {
    throw new NewsRewriteError("NOT_FOUND");
  }

  const { data: cached } = await adminClient
    .from("news_rewrites")
    .select("title, passage")
    .eq("source_url", url)
    .eq("level", level)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();
  if (cached) return respond(cached.title, cached.passage, article.title);

  const { data: allowed, error: limitError } = await userClient.rpc("rate_limit_hit", {
    p_key: "ai",
    p_limit: params.dailyLimit,
  });
  if (limitError) throw new NewsRewriteError("INTERNAL");
  if (!allowed) throw new NewsRewriteError("RATE_LIMITED");

  const original = `${article.title}\n${article.text}`;
  const input = { language: source.language, level, title: article.title, text: article.text };
  const join = (sentences: string[]) => sentences.join(source.language === "ja" ? "" : " ");

  let draft = await rewrite(input);
  if (copiesSource(original, join(draft.sentences), source.language)) {
    draft = await rewrite({ ...input, tooClose: true });
    if (copiesSource(original, join(draft.sentences), source.language)) {
      throw new NewsRewriteError("AI_BAD_REQUEST");
    }
  }

  const passage = join(draft.sentences);
  if (rewrite.cacheable) {
    // A concurrent request may have stored it first; either copy is fine
    await adminClient
      .from("news_rewrites")
      .upsert(
        { source_url: url, level, prompt_version: PROMPT_VERSION, title: draft.title, passage },
        { onConflict: "source_url,level,prompt_version", ignoreDuplicates: true },
      );
  }
  return respond(draft.title, passage, article.title);
}
