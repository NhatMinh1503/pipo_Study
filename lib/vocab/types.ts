import type { LearningLanguage } from "@/lib/schemas/common";

/** A saved word as shown in the notebook. */
export interface VocabItem {
  id: string;
  language: LearningLanguage;
  term: string;
  reading: string | null;
  partOfSpeech: string | null;
  meaning: string;
  contextSentence: string | null;
  contextTranslation: string | null;
  createdAt: string;
  dueDate: string | null;
}
