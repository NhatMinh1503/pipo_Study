import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { NotebookContent } from "./_components/notebook-content";

export const metadata: Metadata = { title: "Notebook" };

export default function NotebookPage() {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        }
      >
        <NotebookContent />
      </Suspense>
    </PageContainer>
  );
}
