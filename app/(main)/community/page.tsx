import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";

import { FeedList } from "./_components/feed-list";

export const metadata: Metadata = { title: "Community" };

async function CommunityHeader() {
  const t = await getTranslations("community");
  return <PageHeader title={t("title")} description={t("description")} />;
}

export default function CommunityPage({ searchParams }: PageProps<"/community">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-16 w-72" />}>
        <CommunityHeader />
      </Suspense>
      <Suspense
        fallback={<Skeleton className="mx-auto h-96 w-full max-w-2xl border-2 border-border" />}
      >
        <FeedList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
