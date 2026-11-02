import { LEVELS_BY_LANGUAGE } from "@/lib/schemas/common";
import { requireOnboardedProfile } from "@/server/profile";

import { NewLessonForm } from "./new-lesson-form";

/** Pre-fills language and level from the profile, and the title when coming from a news item. */
export async function NewLessonLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, query] = await Promise.all([requireOnboardedProfile(), searchParams]);
  const title = typeof query.title === "string" ? query.title.slice(0, 120) : "";
  const language = profile.learning_language ?? "ja";

  return (
    <NewLessonForm
      defaultLanguage={language}
      defaultLevel={profile.level ?? LEVELS_BY_LANGUAGE[language][0]}
      defaultTitle={title}
    />
  );
}
