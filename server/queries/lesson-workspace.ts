import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SentenceAttempts } from "@/lib/scoring";
import type { LessonWorkspace } from "@/lib/lessons/workspace";
import { tokensSchema } from "@/lib/nlp/token";
import type { Database } from "@/types/database";

/**
 * A lesson with its sentences and every attempt, ordered for the translate screen.
 * Returns null when the lesson does not exist or belongs to someone else (RLS).
 */
export async function getLessonWorkspace(
  client: SupabaseClient<Database>,
  lessonId: string,
): Promise<LessonWorkspace | null> {
  const { data: lesson } = await client
    .from("lessons")
    .select(
      "id, title, language, level, completed_at, sentences(id, position, source_text, reference_translation, completed_at, tokens, attempts(verdict, feedback, hint, user_translation, created_at))",
    )
    .eq("id", lessonId)
    .order("position", { referencedTable: "sentences" })
    .order("created_at", { referencedTable: "sentences.attempts" })
    .maybeSingle();
  if (!lesson) return null;

  return {
    id: lesson.id,
    title: lesson.title,
    language: lesson.language,
    level: lesson.level,
    completedAt: lesson.completed_at,
    sentences: lesson.sentences.map((sentence) => {
      const completed = sentence.completed_at !== null;
      return {
        id: sentence.id,
        position: sentence.position,
        sourceText: sentence.source_text,
        // Never send the answer for a sentence the learner has not solved yet
        referenceTranslation: completed ? sentence.reference_translation : null,
        completed,
        tokens: tokensSchema.safeParse(sentence.tokens).data ?? null,
        attempts: sentence.attempts.map((attempt) => ({
          verdict: attempt.verdict,
          feedback: attempt.feedback,
          hint: attempt.hint,
          userTranslation: attempt.user_translation,
        })),
      };
    }),
  };
}

export function toSentenceAttempts(workspace: LessonWorkspace): SentenceAttempts[] {
  return workspace.sentences.map((sentence) => ({
    verdicts: sentence.attempts.map((attempt) => attempt.verdict),
  }));
}
