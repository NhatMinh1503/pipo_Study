"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getLessonWorkspace } from "@/server/queries/lesson-workspace";

/** Publishes a completed lesson: each sentence with the learner's accepted translation. */
export async function publishLesson(lessonId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(lessonId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const supabase = await createClient();
  const workspace = await getLessonWorkspace(supabase, id.data);
  if (!workspace?.completedAt) return { ok: false, error: "errors.unexpected" };

  const pairs = workspace.sentences.map((sentence) => {
    const accepted = sentence.attempts.find((attempt) => attempt.verdict !== "incorrect");
    return {
      source: sentence.sourceText,
      translation: accepted?.userTranslation ?? sentence.referenceTranslation ?? "",
    };
  });

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    lesson_id: workspace.id,
    title: workspace.title,
    language: workspace.language,
    pairs: pairs.slice(0, 20),
  });
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/community");
  redirect("/community");
}

export async function toggleLike(postId: unknown, liked: unknown): Promise<ActionResult> {
  const parsed = z.object({ postId: z.uuid(), liked: z.boolean() }).safeParse({ postId, liked });
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = parsed.data.liked
    ? await supabase.from("likes").delete().eq("post_id", parsed.data.postId).eq("user_id", user.id)
    : await supabase.from("likes").insert({ post_id: parsed.data.postId, user_id: user.id });
  if (error && error.code !== "23505") return { ok: false, error: "errors.unexpected" };

  revalidatePath("/community");
  return { ok: true };
}

export async function addComment(postId: unknown, body: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ postId: z.uuid(), body: z.string().trim().min(1).max(500) })
    .safeParse({ postId, body });
  if (!parsed.success) return { ok: false, error: "validation.required" };

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: parsed.data.postId, user_id: user.id, body: parsed.data.body });
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/community");
  return { ok: true };
}

export async function deletePost(postId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  // RLS: only the author's row matches
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id.data);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/community");
  return { ok: true };
}

export async function reportPost(postId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .insert({ post_id: id.data, user_id: user.id, reason: "inappropriate" });
  // Reporting twice is fine: the first report stands
  if (error && error.code !== "23505") return { ok: false, error: "errors.unexpected" };
  return { ok: true };
}
