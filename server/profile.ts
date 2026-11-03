import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { requireUser } from "./auth";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Current user's profile (RLS limits the query to their own row). Cached per request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data;
});

/** Profile of a user who has finished onboarding; otherwise sends them to /onboarding. */
export async function requireOnboardedProfile(): Promise<Profile & { onboarded_at: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");
  return { ...profile, onboarded_at: profile.onboarded_at };
}
