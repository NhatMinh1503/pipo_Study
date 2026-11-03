import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | undefined;
}

/**
 * Current user from the verified JWT, or null. Cached per request so layouts and
 * pages can both call it without extra round trips.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Auth is always per request; getClaims() also reads the clock to check JWT expiry
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
});

/** Like getSessionUser, but redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
