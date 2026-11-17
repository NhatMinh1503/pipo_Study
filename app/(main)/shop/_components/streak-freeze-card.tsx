"use client";

import { Coins, Snowflake } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GAME } from "@/lib/game/config";
import { buyStreakFreeze } from "@/server/actions/shop";

interface StreakFreezeCardProps {
  coins: number;
  held: number;
}

/** Streak freeze: a Coins sink that protects a streak through one missed day (P5). */
export function StreakFreezeCard({ coins, held }: StreakFreezeCardProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { freezePrice, maxFreezes } = GAME.streak;
  const full = held >= maxFreezes;

  const buy = () =>
    startTransition(async () => {
      const result = await buyStreakFreeze();
      if (result.ok) toast.success(t("shop.freeze.bought"));
      else toast.error(t(result.error ?? "errors.unexpected"));
    });

  return (
    <article className="sheet-tight flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-16 shrink-0 items-center justify-center border-2 border-border bg-tint-slate">
          <Snowflake className="size-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-heading font-semibold">{t("shop.freeze.name")}</p>
          <p className="text-sm text-muted-foreground">{t("shop.freeze.description")}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-border/30 pt-3">
        <span className="mono-value flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Coins className="size-3.5" aria-hidden />
            {freezePrice}
          </span>
          <span className="text-muted-foreground">
            {t("shop.freeze.held", { held, max: maxFreezes })}
          </span>
        </span>
        <Button size="sm" disabled={isPending || full || coins < freezePrice} onClick={buy}>
          {full ? t("shop.freeze.full") : coins < freezePrice ? t("shop.notEnough") : t("shop.buy")}
        </Button>
      </div>
    </article>
  );
}
