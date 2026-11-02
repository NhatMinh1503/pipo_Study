import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { GardenContent } from "./_components/garden-content";

export const metadata: Metadata = { title: "Garden" };

export default function GardenPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <GardenContent />
      </Suspense>
    </PageContainer>
  );
}
