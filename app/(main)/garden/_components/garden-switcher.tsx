import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

interface GardenSwitcherProps {
  gardenIndex: number;
  gardenCount: number;
}

/** Moves between gardens once the first one is full (garden-scene spec §3.4). */
export async function GardenSwitcher({ gardenIndex, gardenCount }: GardenSwitcherProps) {
  const t = await getTranslations("garden.switcher");
  const link = (index: number) => `/garden?khu=${index}`;

  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-3">
      {gardenIndex > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={link(gardenIndex - 1)} aria-label={t("previous")}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
      ) : (
        <span className="size-9" aria-hidden />
      )}
      <p className="mono-label" aria-current="page">
        {t("position", { index: gardenIndex, count: gardenCount })}
      </p>
      {gardenIndex < gardenCount ? (
        <Button asChild variant="outline" size="sm">
          <Link href={link(gardenIndex + 1)} aria-label={t("next")}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <span className="size-9" aria-hidden />
      )}
    </nav>
  );
}
