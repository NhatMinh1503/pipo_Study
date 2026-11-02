import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { LessonsPageHeader } from "../_components/lessons-page-header";

import { NewLessonLoader } from "./_components/new-lesson-loader";

export const metadata: Metadata = { title: "New lesson" };

export default function NewLessonPage({ searchParams }: PageProps<"/lessons/new">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-16 w-72" />}>
        <LessonsPageHeader variant="new" />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewLessonLoader searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
