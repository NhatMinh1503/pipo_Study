import { AccentSync } from "@/components/layout/accent-sync";
import { getCurrentProfile } from "@/server/profile";

/** Reads the user's accent theme and applies it to the whole app. */
export async function UserAccent() {
  const profile = await getCurrentProfile();
  return <AccentSync accent={profile?.accent ?? null} />;
}
