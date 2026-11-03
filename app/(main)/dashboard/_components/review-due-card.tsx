import { Brain } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function ReviewDueCard({ count }: { count: number }) {
  const t = await getTranslations("dashboard");

  return (
    <section className="flex flex-col gap-4 border-2 border-border bg-card p-5 shadow-[4px_4px_0_0_var(--shadow-ink)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Brain className="size-3.5 shrink-0" aria-hidden />
        <h2 className="mono-label">{t("reviewTitle")}</h2>
      </div>
      <div className="border-y border-dashed border-border/40 py-4">
        <p className="mono-value text-5xl leading-none font-bold">{count}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {count > 0 ? t("reviewDue", { count }) : t("reviewNone")}
        </p>
      </div>
      {/* Nothing due still opens the review screen, so the control stays live */}
      <Button asChild variant={count === 0 ? "outline" : "default"} className="mt-auto">
        <Link href="/review">{t("reviewCta")}</Link>
      </Button>
    </section>
  );
}
