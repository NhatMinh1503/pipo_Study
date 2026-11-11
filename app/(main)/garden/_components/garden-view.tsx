"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { stageFor } from "@/lib/garden/growth";
import { SCENE_HEIGHT, SCENE_WIDTH } from "@/lib/garden/layout";
import { buildSceneModel } from "@/lib/garden/scene-model";
import type { GardenScene } from "@/server/queries/garden";

import { useGardenScene } from "../_hooks/use-garden-scene";
import { usePipoSpeech } from "../_hooks/use-pipo-speech";

import { DecorationsPanel } from "./decorations-panel";
import { TreeInfoDialog } from "./tree-info-dialog";

interface GardenViewProps {
  scene: GardenScene;
}

/** The living garden (garden-scene spec §3) plus a text list of its trees. */
export function GardenView({ scene }: GardenViewProps) {
  const t = useTranslations("garden");
  const reducedMotion = usePrefersReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openTree = (treeId: string) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(treeId);
  };
  const { bubble, announcement, speak } = usePipoSpeech(scene);

  const model = useMemo(
    () =>
      buildSceneModel({
        trees: scene.trees,
        hasPond: scene.hasPond,
        pets: scene.pets,
        hasBridge: scene.hasBridge,
        studiedToday: scene.studiedToday,
        decorations: scene.decorations,
      }),
    [scene],
  );

  const { status, greetPipo, highlightSlot } = useGardenScene(host, model, {
    reducedMotion,
    onTreeSelect: openTree,
    onPipoSpeak: speak,
  });
  const selected = scene.trees.find((tree) => tree.id === selectedId) ?? null;

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

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={greetPipo} disabled={status !== "ready"}>
          {t("greet")}
        </Button>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>

      <section aria-labelledby="garden-tree-list" className="space-y-2">
        <h2 id="garden-tree-list" className="mono-label">
          {t("treeList")}
        </h2>
        {scene.trees.length > 0 && (
          <ul className="sheet-flat divide-y divide-dashed divide-border/30">
            {scene.trees.map((tree) => {
              const species = t(`species.${tree.species}`);
              const stage = t(`stage.${stageFor(tree.sessions)}`);
              return (
                <li key={tree.id}>
                  <button
                    type="button"
                    aria-label={`${species} · ${stage}`}
                    onClick={() => openTree(tree.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-tint-mint focus-visible:bg-tint-mint"
                  >
                    <span className="font-medium">{species}</span>
                    <span className="mono-label">{stage}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DecorationsPanel scene={scene} onHighlight={highlightSlot} />

      <TreeInfoDialog
        tree={selected}
        onClose={() => setSelectedId(null)}
        onRestoreFocus={() => opener.current?.focus()}
      />
    </div>
  );
}
