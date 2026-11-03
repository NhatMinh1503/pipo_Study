import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

import { ProfileContent } from "./_components/profile-content";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <ProfileContent />
      </Suspense>
    </PageContainer>
  );
}
