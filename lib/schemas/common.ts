import { z } from "zod";

import type { Database } from "@/types/database";

type DbEnums = Database["public"]["Enums"];

// `satisfies` keeps these lists in lockstep with the Postgres enums in types/database.ts
export const LEARNING_LANGUAGES = [
  "ja",
  "en",
] as const satisfies readonly DbEnums["learning_language"][];
export const DISPLAY_LANGUAGES = [
  "en",
  "vi",
  "ja",
  "my",
  "id",
] as const satisfies readonly DbEnums["display_language"][];

export const JLPT_LEVELS = [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
] as const satisfies readonly DbEnums["proficiency_level"][];
export const CEFR_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const satisfies readonly DbEnums["proficiency_level"][];

export const LEVELS_BY_LANGUAGE = {
  ja: JLPT_LEVELS,
  en: CEFR_LEVELS,
} as const satisfies Record<LearningLanguage, readonly ProficiencyLevel[]>;

export const learningLanguageSchema = z.enum(LEARNING_LANGUAGES);
export const displayLanguageSchema = z.enum(DISPLAY_LANGUAGES);
export const proficiencyLevelSchema = z.enum([...JLPT_LEVELS, ...CEFR_LEVELS]);

export type LearningLanguage = z.infer<typeof learningLanguageSchema>;
export type DisplayLanguage = z.infer<typeof displayLanguageSchema>;
export type ProficiencyLevel = z.infer<typeof proficiencyLevelSchema>;

/** Mirrors the `level_matches_language` check in Postgres: JLPT for Japanese, CEFR for English. */
export function isLevelForLanguage(language: LearningLanguage, level: ProficiencyLevel): boolean {
  return (LEVELS_BY_LANGUAGE[language] as readonly ProficiencyLevel[]).includes(level);
}

export const LEVEL_MISMATCH_MESSAGE = "validation.level_mismatch";
