import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { requireOnboardedProfile } from "@/server/profile";

export async function DashboardGreeting() {
  const [profile, t] = await Promise.all([requireOnboardedProfile(), getTranslations("dashboard")]);

  return (
    <PageHeader
      title={
        profile.display_name ? t("welcome", { name: profile.display_name }) : t("welcomeNoName")
      }
      description={t("subtitle")}
    />
  );
}
