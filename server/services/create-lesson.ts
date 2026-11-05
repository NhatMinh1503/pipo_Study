import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { findOpenSource } from "@/lib/news/open-sources";
import { isUnchangedRewrite } from "@/lib/news/unchanged-rewrite";
import type { LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";
import { PROMPT_VERSION } from "@/server/prompts/rewrite-news.v1";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class CreateLessonError extends Error {
  constructor(readonly code: string | undefined) {
    super("create lesson failed");
  }
}

export interface CreateLessonForLearnerParams {
  /** Acts as the learner: create_lesson always makes a manual lesson. */
  userClient: Client;
  /** Reads the news rewrite cache and creates unchanged news lessons. */
  adminClient: Client;
  userId: string;
  title: string;
  language: LearningLanguage;
  level: ProficiencyLevel;
  /** The passage as submitted, compared with the cached rewrite. */
  text: string;
  sentences: string[];
  newsUrl?: string;
}

/**
 * Saves a lesson the learner submitted from the form. The server decides its source:
 * an unchanged news rewrite is a news lesson; anything else, including an edited rewrite,
 * is a manual lesson. Attribution is kept for any allow-listed article URL.
 */
export async function createLessonForLearner(
  params: CreateLessonForLearnerParams,
): Promise<string> {
  const { userClient, adminClient, userId, title, language, level, text, sentences } = params;
  // Attribution comes from the allow-list, never from what the client sends
  const source = params.newsUrl ? findOpenSource(params.newsUrl) : null;
  const attribution =
    source && params.newsUrl
      ? {
          p_source_name: source.name,
          p_source_url: params.newsUrl,
          p_source_license: source.license,
        }
      : {};

  if (source && params.newsUrl) {
    const { data: cached } = await adminClient
      .from("news_rewrites")
      .select("passage")
      .eq("source_url", params.newsUrl)
      .eq("level", level)
      .eq("prompt_version", PROMPT_VERSION)
      .maybeSingle();
    if (cached && isUnchangedRewrite(text, cached.passage)) {
      const { data, error } = await adminClient.rpc("create_lesson_for_user", {
        p_user_id: userId,
        p_title: title,
        p_language: language,
        p_level: level,
        p_sentences: sentences,
        p_source: "news",
        ...attribution,
      });
      if (error || !data) throw new CreateLessonError(error?.code);
      return data;
    }
  }

  const { data, error } = await userClient.rpc("create_lesson", {
    p_title: title,
    p_language: language,
    p_level: level,
    p_sentences: sentences,
    ...attribution,
  });
  if (error || !data) throw new CreateLessonError(error?.code);
  return data;
}

export interface CreateGeneratedLessonParams {
  adminClient: Client;
  userId: string;
  title: string;
  language: LearningLanguage;
  level: ProficiencyLevel;
  sentences: string[];
}

/** Saves an AI-generated passage (topic lesson or micro-lesson) as the learner's ai lesson. */
export async function createGeneratedLesson(params: CreateGeneratedLessonParams): Promise<string> {
  const { data, error } = await params.adminClient.rpc("create_lesson_for_user", {
    p_user_id: params.userId,
    p_title: params.title,
    p_language: params.language,
    p_level: params.level,
    p_sentences: params.sentences,
    p_source: "ai",
  });
  if (error || !data) throw new CreateLessonError(error?.code);
  return data;
}
