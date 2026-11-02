import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { LessonsList } from "./_components/lessons-list";
import { LessonsPageHeader } from "./_components/lessons-page-header";

export const metadata: Metadata = { title: "Lessons" };

export default function LessonsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-16 w-72" />}>
        <LessonsPageHeader variant="list" />
      </Suspense>
      <Suspense
        fallback={
          <div className="divide-y divide-dashed divide-border/30 border-2 border-border bg-card">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        }
      >
        <LessonsList />
      </Suspense>
    </PageContainer>
  );
}
