import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import { HealthStatus } from "./_components/health-status";
import { HealthStatusSkeleton } from "./_components/health-status-skeleton";

// Landing page for signed-out visitors; signed-in users are redirected to /dashboard by the proxy
export default async function HomePage() {
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <header className="space-y-3">
        <h1 className="text-5xl font-semibold tracking-tight">{t("common.appName")}</h1>
        <p className="text-lg text-muted-foreground">{t("common.tagline")}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/signup">{t("home.getStarted")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">{t("home.signIn")}</Link>
        </Button>
      </div>

      <Suspense fallback={<HealthStatusSkeleton />}>
        <HealthStatus />
      </Suspense>
    </main>
  );
}
