import { findOpenSource } from "@/lib/news/open-sources";
import { LEVELS_BY_LANGUAGE } from "@/lib/schemas/common";
import { requireOnboardedProfile } from "@/server/profile";

import { NewLessonForm } from "./new-lesson-form";

/**
 * Pre-fills language and level from the profile. `?news=<url>` (an allow-listed open article)
 * asks the AI for a passage; `?title=` only fills the title.
 */
export async function NewLessonLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, query] = await Promise.all([requireOnboardedProfile(), searchParams]);
  const title = typeof query.title === "string" ? query.title.slice(0, 120) : "";
  const newsSource = typeof query.news === "string" ? findOpenSource(query.news) : null;
  const newsUrl = newsSource && typeof query.news === "string" ? query.news : undefined;
  // A news passage is written in the source's language, whatever the learner studies
  const language = newsSource?.language ?? profile.learning_language ?? "ja";
  const level =
    profile.level && LEVELS_BY_LANGUAGE[language].some((value) => value === profile.level)
      ? profile.level
      : LEVELS_BY_LANGUAGE[language][0];

  return (
    <NewLessonForm
      defaultLanguage={language}
      defaultLevel={level}
      defaultTitle={title}
      newsUrl={newsUrl}
    />
  );
}
