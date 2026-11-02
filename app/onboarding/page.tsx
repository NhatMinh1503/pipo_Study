import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { OnboardingLoader } from "./_components/onboarding-loader";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <OnboardingLoader />
      </Suspense>
    </main>
  );
}
