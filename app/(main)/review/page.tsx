import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { ReviewLoader } from "./_components/review-loader";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="mx-auto h-72 w-full max-w-xl rounded-2xl" />}>
        <ReviewLoader />
      </Suspense>
    </PageContainer>
  );
}
