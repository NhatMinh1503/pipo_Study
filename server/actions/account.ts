"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { onboardingSchema } from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { setLocaleCookie } from "@/server/locale";
import { logger } from "@/server/logger";
import { createAdminClient } from "@/server/supabase-admin";

const displayNameSchema = z.object({
  displayName: z.string().trim().min(1, { error: "validation.required" }).max(50),
});

export async function updateDisplayName(input: unknown): Promise<ActionResult> {
  const parsed = displayNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: { displayName: "validation.required" } };

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Stores the path of an avatar the user already uploaded into their own Storage folder. */
export async function setAvatarPath(path: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .string()
    .regex(/^[0-9a-f-]{36}\/avatar-\d+\.(png|jpe?g|webp)$/)
    .safeParse(path);
  // The folder must be the user's own id (Storage policies enforce the same on upload)
  if (!parsed.success || !parsed.data.startsWith(`${user.id}/`))
    return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: parsed.data })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Learning language, level, UI language and time zone (same rules as onboarding). */
export async function updateSettings(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation.level_mismatch" };

  const user = await requireUser();
  const { learningLanguage, level, displayLanguage, timeZone } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      learning_language: learningLanguage,
      level,
      display_language: displayLanguage,
      ...(timeZone ? { timezone: timeZone } : {}),
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "errors.unexpected" };

  await setLocaleCookie(displayLanguage);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Permanently deletes the account; every table cascades from auth.users. */
export async function deleteAccount(): Promise<ActionResult> {
  const user = await requireUser();
  const admin = createAdminClient();

  // Storage objects do not cascade; remove the avatar folder first
  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length)
    await admin.storage.from("avatars").remove(files.map((file) => `${user.id}/${file.name}`));

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logger.error("delete account failed", { module: "account" });
    return { ok: false, error: "errors.unexpected" };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
