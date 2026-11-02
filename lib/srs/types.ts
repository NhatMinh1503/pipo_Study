import type { LearningLanguage } from "@/lib/schemas/common";

/** A flashcard with its word, ready to show in a review session. */
export interface ReviewCard {
  id: string;
  language: LearningLanguage;
  term: string;
  reading: string | null;
  meaning: string;
  contextSentence: string | null;
  contextTranslation: string | null;
}
