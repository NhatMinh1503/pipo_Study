"use client";

import { useTranslations } from "next-intl";

import type { TreeSpecies } from "@/lib/garden/growth";
import { growthFrame, GROWN_TREE, SEED_PREVIEW, type TreeLayer } from "@/lib/pomodoro/grow";
import type { PomodoroPhase } from "@/lib/stores/pomodoro";

import { GrowingTreeScene } from "./growing-tree-scene";
import { TreeStages } from "./tree-stages";

interface TreePanelProps {
  phase: PomodoroPhase;
  species: TreeSpecies;
  /** Share of the running session done (0–1). */
  progress: number;
  /** Length of the next (or current) session, for the caption. */
  minutes: number;
  /** The last session was left early: its tree is shown wilting. */
  withered: boolean;
}

/** The left sheet of the Pomodoro page: one session grows one whole tree (Forest style). */
export function TreePanel({ phase, species, progress, minutes, withered }: TreePanelProps) {
  const t = useTranslations("pomodoro.scene");
  const speciesName = useTranslations("garden.species");
  const stageName = useTranslations("pomodoro.scene.stages");

  let tree: TreeLayer;
  if (phase === "focus") tree = growthFrame(progress);
  else if (phase === "break") tree = GROWN_TREE;
  else if (withered) tree = { stage: "sapling", opacity: 1, scale: 0.9 };
  else tree = SEED_PREVIEW;

  const name = speciesName(species);
  const caption = withered
    ? t("withered", { species: name })
    : phase === "focus"
      ? t("focus", { species: name, stage: stageName(tree.stage) })
      : phase === "break"
        ? t("break", { species: name })
        : t("seed", { species: name, minutes });

  return (
    <section className="sheet space-y-3 p-3">
      <GrowingTreeScene
        species={species}
        tree={tree}
        windy={phase !== "idle"}
        celebrate={phase === "break"}
        withered={withered}
        label={caption}
      />
      <p className="px-1 text-sm font-medium" aria-hidden>
        {caption}
      </p>
      <TreeStages species={species} current={phase === "idle" ? null : tree.stage} />
    </section>
  );
}
