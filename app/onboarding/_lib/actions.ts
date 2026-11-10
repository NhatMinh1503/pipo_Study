"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { displayLanguageSchema } from "@/lib/schemas/common";
import { onboardingSchema } from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { setLocaleCookie } from "@/server/locale";
import { logger } from "@/server/logger";

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

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
      onboarded_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    logger.error("onboarding update failed", { code: error.code, module: "onboarding" });
    return { ok: false, error: "errors.unexpected" };
  }

  await setLocaleCookie(displayLanguage);
  redirect("/dashboard");
}

/** Switches the UI language as soon as the learner picks it on the last step. */
export async function previewDisplayLanguage(input: unknown): Promise<void> {
  const parsed = displayLanguageSchema.safeParse(input);
  if (parsed.success) await setLocaleCookie(parsed.data);
}
