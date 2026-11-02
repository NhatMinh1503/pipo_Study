import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOnboardedProfile } from "@/server/profile";

import { DeleteAccount } from "./_components/delete-account";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = { title: "Settings" };

async function SettingsContent() {
  const [profile, t] = await Promise.all([requireOnboardedProfile(), getTranslations("settings")]);
  const timeZones = Intl.supportedValuesOf("timeZone");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsForm
        initial={{
          learningLanguage: profile.learning_language ?? "ja",
          level: profile.level ?? "N5",
          displayLanguage: profile.display_language,
          timeZone: timeZones.includes(profile.timezone) ? profile.timezone : "Asia/Tokyo",
        }}
        timeZones={timeZones}
      />
      <DeleteAccount />
    </>
  );
}

export default function SettingsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <SettingsContent />
      </Suspense>
    </PageContainer>
  );
}
