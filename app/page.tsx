import { Suspense } from "react";

import { HealthStatus } from "./_components/health-status";
import { HealthStatusSkeleton } from "./_components/health-status-skeleton";

// Temporary landing page for S01; replaced by the real home in S05 (text moves to i18n then)
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Hello pipo</h1>
        <p className="text-muted-foreground">
          Học ngoại ngữ qua dịch thuật ngữ cảnh, SRS và phản hồi AI.
        </p>
      </header>

      {/* Database read happens at request time, so it streams in after the static shell */}
      <Suspense fallback={<HealthStatusSkeleton />}>
        <HealthStatus />
      </Suspense>
    </main>
  );
}
