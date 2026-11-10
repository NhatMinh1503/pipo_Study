"use client";

import { Lock } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { canPlant, TREE_SPECIES, type TreeSpecies } from "@/lib/garden/growth";
import { cn } from "@/lib/utils";

interface TreePickerProps {
  ownedItemIds: string[];
  value: TreeSpecies;
  onChange: (species: TreeSpecies) => void;
  disabled?: boolean;
}

/** The seed the next session plants (Forest style: each session grows its own tree). */
export function TreePicker({ ownedItemIds, value, onChange, disabled = false }: TreePickerProps) {
  const t = useTranslations("pomodoro.tree");
  const species = useTranslations("garden.species");
  const title = t("title");

  return (
    <fieldset className="w-full space-y-2" disabled={disabled}>
      <legend className="mono-label mb-2">{title}</legend>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-2 gap-2">
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
                src={`/pomodoro/tree-${option}-mature.webp`}
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
