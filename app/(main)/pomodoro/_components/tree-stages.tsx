import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { assetUrl, gardenAsset } from "@/lib/garden/assets";
import type { TreeSpecies, TreeStage } from "@/lib/garden/growth";
import { cn } from "@/lib/utils";

const STAGES: readonly TreeStage[] = ["sprout", "sapling", "mature"];

interface TreeStagesProps {
  species: TreeSpecies;
  /** The stage on screen now; null before the tree is planted. */
  current: TreeStage | null;
}

/**
 * The three pictures of this species side by side, drawn at their real relative size
 * (sprout → young tree → mature), with the stage on screen marked. Shows where the
 * session is taking the tree.
 */
export function TreeStages({ species, current }: TreeStagesProps) {
  const t = useTranslations("pomodoro.scene");
  const tallest = gardenAsset(`tree-${species}-mature`).height;

  return (
    <ol className="flex items-end justify-center gap-1 sm:gap-2" aria-label={t("stagesLabel")}>
      {STAGES.map((stage, index) => {
        const id = `tree-${species}-${stage}`;
        const asset = gardenAsset(id);
        const active = stage === current;
        return (
          <Fragment key={stage}>
            {index > 0 && (
              <ChevronRight className="mb-7 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <li
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-28 flex-col items-center gap-1 border-2 px-1 pt-2 pb-1.5",
                active ? "border-border bg-tint-mint" : "border-transparent",
              )}
            >
              <span className="flex h-16 items-end">
                <Image
                  src={assetUrl(id)}
                  alt=""
                  width={asset.width * 2}
                  height={asset.height * 2}
                  unoptimized
                  className="w-auto"
                  style={{ height: `${(asset.height / tallest) * 4}rem` }}
                />
              </span>
              <span className={cn("text-center text-xs", active && "font-semibold")}>
                ({index + 1}) {t(`stages.${stage}`)}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
