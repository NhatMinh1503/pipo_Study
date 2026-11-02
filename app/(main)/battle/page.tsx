import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { BattleLobby } from "./_components/battle-lobby";

export const metadata: Metadata = { title: "Battle" };

export default function BattlePage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-72 border-2 border-border" />}>
        <BattleLobby />
      </Suspense>
    </PageContainer>
  );
}
