import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOnboardedProfile } from "@/server/profile";

import { GenerateForm } from "./_components/generate-form";

export const metadata: Metadata = { title: "Generate lesson" };

async function GenerateContent() {
  const [profile, t] = await Promise.all([requireOnboardedProfile(), getTranslations("generate")]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <GenerateForm level={profile.level ?? ""} />
    </>
  );
}

export default function GenerateLessonPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-64 border-2 border-border" />}>
        <GenerateContent />
      </Suspense>
    </PageContainer>
  );
}
