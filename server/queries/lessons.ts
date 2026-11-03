import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";

export interface LessonSummary {
  id: string;
  title: string;
  language: LearningLanguage;
  level: ProficiencyLevel;
  createdAt: string;
  completedAt: string | null;
  /** Sentences already translated correctly. */
  done: number;
  total: number;
}

interface ListOptions {
  inProgressOnly?: boolean;
  limit?: number;
}

/** The user's lessons, newest activity first, with per-lesson progress. RLS scopes rows. */
export async function listLessonsWithProgress({
  inProgressOnly = false,
  limit = 50,
}: ListOptions = {}): Promise<LessonSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("lessons")
    .select("id, title, language, level, created_at, completed_at, sentences(completed_at)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (inProgressOnly) query = query.is("completed_at", null);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    language: lesson.language,
    level: lesson.level,
    createdAt: lesson.created_at,
    completedAt: lesson.completed_at,
    done: lesson.sentences.filter((sentence) => sentence.completed_at !== null).length,
    total: lesson.sentences.length,
  }));
}
