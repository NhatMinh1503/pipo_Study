import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/server/profile";

import { OnboardingWizard } from "./_components/onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <OnboardingWizard initialDisplayLanguage={profile?.display_language ?? "vi"} />
    </main>
  );
}
