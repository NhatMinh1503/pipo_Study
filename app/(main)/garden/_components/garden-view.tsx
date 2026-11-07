"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { sessionsToMature, stageFor } from "@/lib/garden/growth";
import { SCENE_HEIGHT, SCENE_WIDTH, type Point } from "@/lib/garden/layout";
import { buildSceneModel } from "@/lib/garden/scene-model";
import { pickLine, type LineKey } from "@/lib/garden/speech";
import type { GardenScene } from "@/server/queries/garden";

import { useGardenScene } from "../_hooks/use-garden-scene";

const BUBBLE_MS = 3500;

interface GardenViewProps {
  scene: GardenScene;
}

/** The living garden (garden-scene spec §3) plus a text list of its trees. */
export function GardenView({ scene }: GardenViewProps) {
  const t = useTranslations("garden");
  const reducedMotion = usePrefersReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<({ text: string } & Point) | null>(null);
  const lastLine = useRef<LineKey | null>(null);
  const bubbleTimer = useRef<number | undefined>(undefined);

  const model = useMemo(
    () =>
      buildSceneModel({
        trees: scene.trees,
        hasPond: scene.hasPond,
        hasCat: scene.hasCat,
        studiedToday: scene.studiedToday,
      }),
    [scene],
  );

  const speak = (position: Point) => {
    const line = pickLine(
      {
        treeCount: scene.totalTrees,
        growing: scene.growing
          ? {
              species: scene.growing.species,
              sessionsLeft: sessionsToMature(scene.growing.sessions),
            }
          : null,
        sakuraCount: scene.trees.filter(
          (tree) => tree.species === "sakura" && stageFor(tree.sessions) === "mature",
        ).length,
        studiedToday: scene.studiedToday,
      },
      lastLine.current,
    );
    lastLine.current = line.key;
    const values = { ...line.values };
    if (typeof values.species === "string") values.species = t(`species.${values.species}`);
    setBubble({ text: t(`pipo.${line.key}`, values), ...position });
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), BUBBLE_MS);
  };

  const { status } = useGardenScene(host, model, {
    reducedMotion,
    onTreeSelect: () => undefined,
    onPipoSpeak: speak,
  });

  const growingHere = scene.trees.filter((tree) => stageFor(tree.sessions) !== "mature").length;

  return (
    <div className="space-y-4">
      <div
        role="img"
        aria-label={t("sceneLabel", { count: scene.trees.length, growing: growingHere })}
        data-scene-ready={status === "ready"}
        data-motion={reducedMotion ? "reduced" : "full"}
        className="sheet relative w-full overflow-hidden bg-tint-slate"
        style={{ aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}` }}
      >
        <div ref={host} className="absolute inset-0" />
        {status === "loading" && <Skeleton className="absolute inset-0" />}
        {status === "error" && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {t("sceneError")}
          </p>
        )}
        {bubble && (
          <p
            aria-hidden
            className="pointer-events-none absolute max-w-[45%] -translate-x-1/2 -translate-y-full border-2 border-border bg-card px-2.5 py-1.5 text-xs leading-snug shadow-[2px_2px_0_0_var(--shadow-ink)]"
            style={{
              left: `${(bubble.x / SCENE_WIDTH) * 100}%`,
              top: `${(bubble.y / SCENE_HEIGHT) * 100}%`,
            }}
          >
            {bubble.text}
          </p>
        )}
      </div>

      <section aria-labelledby="garden-tree-list" className="space-y-2">
        <h2 id="garden-tree-list" className="mono-label">
          {t("treeList")}
        </h2>
        {scene.trees.length > 0 && (
          <ul className="sheet-flat divide-y divide-dashed divide-border/30">
            {scene.trees.map((tree) => (
              <li
                key={tree.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span className="font-medium">{t(`species.${tree.species}`)}</span>
                <span className="mono-label">{t(`stage.${stageFor(tree.sessions)}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
