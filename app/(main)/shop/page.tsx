import { Coins } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getShopState } from "@/server/queries/shop";

import { ShopItemCard } from "./_components/shop-item-card";
import { StreakFreezeCard } from "./_components/streak-freeze-card";

export const metadata: Metadata = { title: "Shop" };

// Accent colours and topic packs were placeholders and are no longer sold; owners keep them
const SECTIONS = ["seed", "decoration", "pet"] as const;

async function ShopContent() {
  const supabase = await createClient();
  const [state, t, wallet] = await Promise.all([
    getShopState(),
    getTranslations("shop"),
    supabase.from("wallet_summaries").select("streak_freezes").maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <span
            className="sheet-flat mono-value flex items-center gap-2 px-3 py-2"
            aria-label={t("balance")}
          >
            <Coins className="size-4" aria-hidden />
            {state.coins}
          </span>
        }
      />
      <section className="space-y-3">
        <h2 className="mono-label">{t("sections.streak")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <StreakFreezeCard coins={state.coins} held={wallet.data?.streak_freezes ?? 0} />
          </li>
        </ul>
      </section>
      {SECTIONS.map((kind) => {
        const items = state.items.filter((item) => item.kind === kind);
        // A section with nothing to sell (e.g. before a catalog migration) is not shown
        if (items.length === 0) return null;
        return (
          <section key={kind} className="space-y-3">
            <h2 className="mono-label">{t(`sections.${kind}`)}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <ShopItemCard item={item} coins={state.coins} active={state.accent === item.id} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export default function ShopPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <ShopContent />
      </Suspense>
    </PageContainer>
  );
}
