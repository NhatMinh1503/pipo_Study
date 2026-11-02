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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="sheet-tight w-full p-8 sm:p-10">
        <h1 className="font-heading text-4xl leading-none font-bold tracking-[0.16em] uppercase sm:text-5xl">
          {t("common.appName")}
        </h1>

        <div className="mt-6 border-t border-dashed border-border/40 pt-6">
          <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("common.tagline")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">{t("home.getStarted")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">{t("home.signIn")}</Link>
          </Button>
        </div>

        <div className="mt-9 border-t border-dashed border-border/40 pt-4">
          <Suspense fallback={<HealthStatusSkeleton />}>
            <HealthStatus />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
