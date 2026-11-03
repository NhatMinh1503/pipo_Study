import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { ClozeLoader } from "./_components/cloze-loader";

export const metadata: Metadata = { title: "Cloze" };

export default function ClozePage({ params, searchParams }: PageProps<"/lessons/[id]/cloze">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-72 border-2 border-border" />}>
        <ClozeLoader params={params} searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
