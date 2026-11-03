import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { ResultLoader } from "./_components/result-loader";

export const metadata: Metadata = { title: "Result" };

export default function ResultPage({ params }: PageProps<"/lessons/[id]/result">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ResultLoader params={params} />
      </Suspense>
    </PageContainer>
  );
}
