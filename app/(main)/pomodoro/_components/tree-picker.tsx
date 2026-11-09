"use client";

import { Lock } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { canPlant, TREE_SPECIES, type TreeSpecies } from "@/lib/garden/growth";
import { GAME } from "@/lib/game/config";
import { cn } from "@/lib/utils";

interface TreePickerProps {
  growing: { species: TreeSpecies; sessions: number } | null;
  ownedItemIds: string[];
  value: TreeSpecies;
  onChange: (species: TreeSpecies) => void;
}

/**
 * The tree the next session will plant (garden-scene spec §3.1–3.2). While a tree is
 * growing, sessions tend it, so this shows its progress instead of a choice.
 */
export function TreePicker({ growing, ownedItemIds, value, onChange }: TreePickerProps) {
  const t = useTranslations("pomodoro.tree");
  const species = useTranslations("garden.species");

  if (growing) {
    return (
      <p className="sheet-flat w-full bg-tint-mint p-3 text-center text-sm" role="status">
        {t("growing", {
          species: species(growing.species),
          sessions: growing.sessions,
          total: GAME.garden.matureAtSessions,
        })}
      </p>
    );
  }

  return (
    <fieldset className="w-full space-y-2">
      <legend className="mono-label mb-2">{t("title")}</legend>
      <div role="radiogroup" aria-label={t("title")} className="grid grid-cols-2 gap-2">
        {TREE_SPECIES.map((option) => {
          const unlocked = canPlant(option, ownedItemIds);
          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center gap-2 border-2 border-border px-3 py-2 text-sm",
                value === option && "bg-tint-mint font-semibold",
                !unlocked && "cursor-not-allowed text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="tree-species"
                value={option}
                checked={value === option}
                disabled={!unlocked}
                onChange={() => onChange(option)}
                className="accent-[var(--success)]"
              />
              <Image
                src={`/garden/tree-${option}-mature@2x.png`}
                alt=""
                width={28}
                height={34}
                className={cn("h-8 w-auto shrink-0", !unlocked && "opacity-40 grayscale")}
              />
              <span className="flex-1">{species(option)}</span>
              {!unlocked && (
                <span className="flex items-center gap-1 text-xs">
                  <Lock className="size-3" aria-hidden />
                  {t("needsSeed")}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
