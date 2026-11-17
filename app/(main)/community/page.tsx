import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { FeedList } from "./_components/feed-list";

export const metadata: Metadata = { title: "Community" };

async function CommunityHeader() {
  const supabase = await createClient();
  const [t, { data: isModerator }] = await Promise.all([
    getTranslations("community"),
    supabase.rpc("is_moderator"),
  ]);
  return (
    <PageHeader
      title={t("title")}
      description={t("description")}
      actions={
        isModerator ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/moderation">{t("moderation")}</Link>
          </Button>
        ) : undefined
      }
    />
  );
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
