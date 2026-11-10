"use client";

import { useTranslations } from "next-intl";

import { GAME } from "@/lib/game/config";
import type { TreeStage } from "@/lib/garden/growth";
import { growthFrame, restingTree, type SessionTree, type TreeLayer } from "@/lib/pomodoro/grow";
import type { PomodoroPhase } from "@/lib/stores/pomodoro";
import { cn } from "@/lib/utils";

import { GrowingTreeScene } from "./growing-tree-scene";
import { TreeStages } from "./tree-stages";

interface TreePanelProps {
  phase: PomodoroPhase;
  tree: SessionTree;
  /** Share of the running session done (0–1). */
  progress: number;
}

/** Before the first session: a faint sprout of the chosen species shows what will grow. */
const SEED_PREVIEW = { opacity: 0.4, scale: 0.6 };

const stageOf = (layer: TreeLayer): TreeStage =>
  layer.assetId.endsWith("mature")
    ? "mature"
    : layer.assetId.endsWith("sapling")
      ? "sapling"
      : "sprout";

/** The left sheet of the Pomodoro page: the tree growing with the timer and its stages. */
export function TreePanel({ phase, tree, progress }: TreePanelProps) {
  const t = useTranslations("pomodoro");
  const speciesName = useTranslations("garden.species");

  const planted = phase === "focus" || tree.fromSessions > 0;
  const layer: TreeLayer =
    phase === "focus"
      ? growthFrame(tree, progress)
      : (restingTree(tree) ?? { assetId: `tree-${tree.species}-sprout`, ...SEED_PREVIEW });
  const current = planted ? stageOf(layer) : null;

  const total = GAME.garden.matureAtSessions;
  const sessionsShown = Math.min(total, tree.fromSessions + (phase === "focus" ? 1 : 0));
  const name = speciesName(tree.species);
  const caption =
    phase === "focus"
      ? t("scene.focus", { species: name, session: sessionsShown, total })
      : phase === "break"
        ? t("scene.break", { species: name, sessions: sessionsShown, total })
        : tree.fromSessions > 0
          ? t("scene.growing", { species: name, sessions: tree.fromSessions, total })
          : t("scene.seed", { species: name });

  return (
    <section className="sheet space-y-3 p-3">
      <GrowingTreeScene
        species={tree.species}
        tree={layer}
        windy
        celebrate={phase === "break"}
        label={caption}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-medium" aria-hidden>
          {caption}
        </p>
        <ol
          className="flex gap-1.5"
          aria-label={t("scene.sessions", { sessions: sessionsShown, total })}
        >
          {Array.from({ length: total }, (_, index) => (
            <li
              key={index}
              className={cn(
                "size-3 border-2 border-border",
                index < sessionsShown ? "bg-success" : "bg-card",
                phase === "focus" && index === sessionsShown - 1 && "animate-pulse",
              )}
            />
          ))}
        </ol>
      </div>
      <TreeStages species={tree.species} current={current} />
    </section>
  );
}
