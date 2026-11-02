import { Brain } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function ReviewDueCard({ count }: { count: number }) {
  const t = await getTranslations("dashboard");

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Brain className="size-4" aria-hidden />
        {t("reviewTitle")}
      </div>
      <p className="text-4xl font-semibold tabular-nums">{count}</p>
      <p className="text-sm text-muted-foreground">
        {count > 0 ? t("reviewDue", { count }) : t("reviewNone")}
      </p>
      <Button asChild disabled={count === 0} className="mt-auto">
        <Link href="/review">{t("reviewCta")}</Link>
      </Button>
    </section>
  );
}
