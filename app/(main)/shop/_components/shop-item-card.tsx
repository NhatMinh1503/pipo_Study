"use client";

import { Check, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SHOP_ITEMS, type ShopEntry } from "@/lib/shop/catalog";
import { buyItem, setAccent } from "@/server/actions/shop";

interface ShopItemCardProps {
  item: ShopEntry;
  coins: number;
  /** True when this theme is the active accent. */
  active: boolean;
}

export function ShopItemCard({ item, coins, active }: ShopItemCardProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const display = SHOP_ITEMS[item.id];

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(t(success));
      else toast.error(t(result.error ?? "errors.unexpected"));
    });

  return (
    <article className="sheet-tight flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        {"swatch" in display && (
          <span
            className="size-9 shrink-0 border-2 border-border"
            style={{ backgroundColor: display.swatch }}
            aria-hidden
          />
        )}
        {"emoji" in display && (
          <span className="text-3xl" aria-hidden>
            {display.emoji}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-heading font-semibold">{t(`shop.items.${item.id}.name`)}</p>
          <p className="text-sm text-muted-foreground">{t(`shop.items.${item.id}.description`)}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-border/30 pt-3">
        <span className="mono-value flex items-center gap-1 text-sm">
          <Coins className="size-3.5" aria-hidden />
          {item.price}
        </span>
        {!item.owned ? (
          <Button
            size="sm"
            disabled={isPending || coins < item.price}
            onClick={() => run(() => buyItem(item.id), "shop.bought")}
          >
            {coins < item.price ? t("shop.notEnough") : t("shop.buy")}
          </Button>
        ) : item.kind === "theme" ? (
          <Button
            size="sm"
            variant={active ? "outline" : "default"}
            disabled={isPending}
            onClick={() => run(() => setAccent(active ? null : item.id), "shop.applied")}
          >
            {active ? t("shop.stopUsing") : t("shop.use")}
          </Button>
        ) : (
          <span className="mono-label flex items-center gap-1">
            <Check className="size-3.5" aria-hidden />
            {t("shop.owned")}
          </span>
        )}
      </div>
    </article>
  );
}
