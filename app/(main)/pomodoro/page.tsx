import type { Metadata } from "next";

import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { PomodoroLoader } from "./_components/pomodoro-loader";

export const metadata: Metadata = { title: "Pomodoro" };

export default function PomodoroPage() {
  return (
    <PageContainer className="items-center justify-center">
      <Suspense fallback={<Skeleton className="size-72 rounded-full border-2 border-border" />}>
        <PomodoroLoader />
      </Suspense>
    </PageContainer>
  );
}
