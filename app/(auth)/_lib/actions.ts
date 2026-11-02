"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { publicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";
import { setLocaleCookie } from "@/server/locale";
import { logger } from "@/server/logger";

import { mapAuthError } from "./map-auth-error";

const log = logger.child({ module: "auth-actions" });

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    log.info("sign in rejected", { code: error.code });
    return { ok: false, error: mapAuthError(error.code) };
  }

  // Restore the user's UI language on this device
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_language")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profile) await setLocaleCookie(profile.display_language);

  redirect(safeRedirectPath(next));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl("/onboarding") },
  });

  // Supabase returns success for already-registered emails (no account enumeration);
  // the UI always shows "check your email".
  if (error) {
    log.warn("sign up failed", { code: error.code });
    return { ok: false, error: mapAuthError(error.code) };
  }
  return { ok: true };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });

  // Only rate limiting is surfaced; anything else looks like success to avoid enumeration
  if (error?.code === "over_email_send_rate_limit") {
    return { ok: false, error: mapAuthError(error.code) };
  }
  if (error) log.warn("password reset request failed", { code: error.code });
  return { ok: true };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    log.info("password update rejected", { code: error.code });
    return { ok: false, error: mapAuthError(error.code) };
  }

  redirect("/dashboard?passwordUpdated=1");
}
