import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

import type { TreeSpecies, TreeStage } from "@/lib/garden/growth";
import { cn } from "@/lib/utils";

import { STAGE_HEIGHT, treeImage } from "./growing-tree-scene";

const STAGES: readonly TreeStage[] = ["sprout", "sapling", "mature"];

interface TreeStagesProps {
  species: TreeSpecies;
  /** The stage on screen now; null before the session starts. */
  current: TreeStage | null;
}

/**
 * The three pictures of this species side by side at their relative size (sprout → young
 * tree → mature), with the stage on screen marked: where this session takes the tree.
 */
export function TreeStages({ species, current }: TreeStagesProps) {
  const t = useTranslations("pomodoro.scene");

  return (
    <ol
      className="flex w-full min-w-0 items-end justify-center gap-1 sm:gap-2"
      aria-label={t("stagesLabel")}
    >
      {STAGES.map((stage, index) => {
        const active = stage === current;
        return (
          <Fragment key={stage}>
            {index > 0 && (
              <ChevronRight className="mb-7 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <li
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex max-w-28 min-w-0 flex-1 flex-col items-center gap-1 border-2 px-1 pt-2 pb-1.5",
                active ? "border-border bg-tint-mint" : "border-transparent",
              )}
            >
              <span className="flex h-16 items-end">
                {/* eslint-disable-next-line @next/next/no-img-element -- small decorative art */}
                <img
                  src={treeImage(species, stage)}
                  alt=""
                  className="w-auto"
                  style={{ height: `${(STAGE_HEIGHT[stage] / STAGE_HEIGHT.mature) * 4}rem` }}
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
