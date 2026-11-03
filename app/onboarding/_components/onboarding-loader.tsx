import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/server/profile";

import { OnboardingWizard } from "./onboarding-wizard";

export async function OnboardingLoader() {
  const profile = await getCurrentProfile();
  if (profile?.onboarded_at) redirect("/dashboard");

  return <OnboardingWizard initialDisplayLanguage={profile?.display_language ?? "vi"} />;
}
