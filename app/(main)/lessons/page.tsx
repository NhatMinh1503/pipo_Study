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
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        }
      >
        <LessonsList />
      </Suspense>
    </PageContainer>
  );
}
