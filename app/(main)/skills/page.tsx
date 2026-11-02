import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";

import { SkillTreeView } from "./_components/skill-tree-view";

export const metadata: Metadata = { title: "Skill tree" };

async function SkillsHeader() {
  const t = await getTranslations("skills");
  return <PageHeader title={t("title")} description={t("description")} />;
}

export default function SkillsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-16 w-72" />}>
        <SkillsHeader />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <SkillTreeView />
      </Suspense>
    </PageContainer>
  );
}
