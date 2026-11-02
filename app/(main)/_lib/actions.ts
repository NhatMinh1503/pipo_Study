"use server";

import { redirect } from "next/navigation";

import { displayLanguageSchema } from "@/lib/schemas/common";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { setLocaleCookie } from "@/server/locale";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Saves the UI language on the profile and switches this device to it. */
export async function updateDisplayLanguage(input: unknown) {
  const locale = displayLanguageSchema.parse(input);
  const user = await requireUser();

  const supabase = await createClient();
  await supabase.from("profiles").update({ display_language: locale }).eq("user_id", user.id);
  await setLocaleCookie(locale);
}
