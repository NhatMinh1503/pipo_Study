import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { DashboardContent } from "./_components/dashboard-content";
import { DashboardGreeting } from "./_components/dashboard-greeting";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-16 w-72" />}>
        <DashboardGreeting />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </PageContainer>
  );
}
