import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { LeaderboardContent } from "./_components/leaderboard-content";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <LeaderboardContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
