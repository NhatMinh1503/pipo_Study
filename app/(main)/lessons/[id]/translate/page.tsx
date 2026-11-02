import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { TranslateLoader } from "./_components/translate-loader";

export const metadata: Metadata = { title: "Translate" };

export default function TranslatePage({ params }: PageProps<"/lessons/[id]/translate">) {
  return (
    <PageContainer className="max-w-6xl">
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        }
      >
        <TranslateLoader params={params} />
      </Suspense>
    </PageContainer>
  );
}
