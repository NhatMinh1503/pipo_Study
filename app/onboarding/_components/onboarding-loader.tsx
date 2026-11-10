import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { isLocale } from "@/lib/i18n/config";

import { getCurrentProfile } from "@/server/profile";

import { OnboardingWizard } from "./onboarding-wizard";

export async function OnboardingLoader() {
  const profile = await getCurrentProfile();
  if (profile?.onboarded_at) redirect("/dashboard");

  // Preselect the language the UI is in now (English for a new visitor)
  const locale = await getLocale();
  return <OnboardingWizard initialDisplayLanguage={isLocale(locale) ? locale : "en"} />;
}
