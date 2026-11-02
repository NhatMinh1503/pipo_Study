import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { BattleLoader } from "./_components/battle-loader";

export const metadata: Metadata = { title: "Battle" };

export default function BattleRoomPage({ params }: PageProps<"/battle/[id]">) {
  return (
    <PageContainer className="max-w-3xl">
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <BattleLoader params={params} />
      </Suspense>
    </PageContainer>
  );
}
