import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline" };

async function OfflineMessage() {
  const t = await getTranslations("offline");
  return (
    <section className="sheet w-full space-y-4 p-6 text-center">
      <WifiOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h1 className="font-heading text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/review">{t("review")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/notebook">{t("notebook")}</Link>
        </Button>
      </div>
    </section>
  );
}

/** Served by the service worker when a page cannot be loaded without a connection. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <Suspense fallback={null}>
        <OfflineMessage />
      </Suspense>
    </main>
  );
}
