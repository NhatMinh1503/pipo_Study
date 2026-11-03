import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { NewsContent } from "./_components/news-content";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <NewsContent />
      </Suspense>
    </PageContainer>
  );
}
