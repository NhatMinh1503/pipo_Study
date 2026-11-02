import type { Token } from "@/lib/nlp/token";
import type { LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";
import type { Verdict } from "@/lib/schemas/translation";

// Shapes of the translate screen data, shared by the server query and client components

export interface WorkspaceAttempt {
  verdict: Verdict;
  feedback: string;
  hint: string | null;
  userTranslation: string;
}

export interface WorkspaceSentence {
  id: string;
  position: number;
  sourceText: string;
  /** Shown only once the sentence is completed. */
  referenceTranslation: string | null;
  completed: boolean;
  attempts: WorkspaceAttempt[];
  /** Clickable words for the dictionary popup; null until tokenized. */
  tokens: Token[] | null;
}

export interface LessonWorkspace {
  id: string;
  title: string;
  language: LearningLanguage;
  level: ProficiencyLevel;
  completedAt: string | null;
  sentences: WorkspaceSentence[];
}
