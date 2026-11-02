import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { unlockedTopics } from "@/lib/shop/catalog";
import { requireOnboardedProfile } from "@/server/profile";
import { getOwnedItemIds } from "@/server/queries/shop";

import { GenerateForm } from "./_components/generate-form";

export const metadata: Metadata = { title: "Generate lesson" };

async function GenerateContent() {
  const [profile, owned, t] = await Promise.all([
    requireOnboardedProfile(),
    getOwnedItemIds(),
    getTranslations("generate"),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <GenerateForm level={profile.level ?? ""} extraTopics={unlockedTopics(owned)} />
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
