import { LEVELS_BY_LANGUAGE } from "@/lib/schemas/common";
import { requireOnboardedProfile } from "@/server/profile";

import { NewLessonForm } from "./new-lesson-form";

/** Pre-fills the form with the learner's language and level from their profile. */
export async function NewLessonLoader() {
  const profile = await requireOnboardedProfile();
  const language = profile.learning_language ?? "ja";

  return (
    <NewLessonForm
      defaultLanguage={language}
      defaultLevel={profile.level ?? LEVELS_BY_LANGUAGE[language][0]}
    />
  );
}
