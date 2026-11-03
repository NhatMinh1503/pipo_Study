import { z } from "zod";

import { isValidTimeZone } from "@/lib/timezone";

import {
  displayLanguageSchema,
  isLevelForLanguage,
  learningLanguageSchema,
  LEVEL_MISMATCH_MESSAGE,
  proficiencyLevelSchema,
} from "./common";

/** Input of the 3-step onboarding form. */
export const onboardingSchema = z
  .object({
    learningLanguage: learningLanguageSchema,
    level: proficiencyLevelSchema,
    displayLanguage: displayLanguageSchema,
    // Browser time zone, used to decide what "today" means for streaks
    timeZone: z.string().refine(isValidTimeZone).optional(),
  })
  .refine((value) => isLevelForLanguage(value.learningLanguage, value.level), {
    message: LEVEL_MISMATCH_MESSAGE,
    path: ["level"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
