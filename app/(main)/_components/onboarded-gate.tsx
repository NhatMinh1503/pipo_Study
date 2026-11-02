import { requireOnboardedProfile } from "@/server/profile";

/**
 * Authoritative server check for every (main) page: signed in and onboarded.
 * The proxy redirects optimistically; this is the real guard.
 */
export async function OnboardedGate({ children }: { children: React.ReactNode }) {
  await requireOnboardedProfile();
  return children;
}
