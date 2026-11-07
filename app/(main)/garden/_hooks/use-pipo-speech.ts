"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { SCENE } from "@/lib/garden/config";
import { sessionsToMature, stageFor } from "@/lib/garden/growth";
import type { Point } from "@/lib/garden/layout";
import { pickLine, type GardenFacts, type LineKey } from "@/lib/garden/speech";
import type { GardenScene } from "@/server/queries/garden";

const BUBBLE_MS = 3500;

function factsOf(scene: GardenScene): GardenFacts {
  return {
    treeCount: scene.totalTrees,
    growing: scene.growing
      ? { species: scene.growing.species, sessionsLeft: sessionsToMature(scene.growing.sessions) }
      : null,
    sakuraCount: scene.trees.filter(
      (tree) => tree.species === "sakura" && stageFor(tree.sessions) === "mature",
    ).length,
    studiedToday: scene.studiedToday,
  };
}

/**
 * What Pipo says (garden-scene spec §3.7): a speech bubble above its head, and the same
 * line for screen readers at most once every SCENE.speechAnnounceSeconds.
 */
export function usePipoSpeech(scene: GardenScene) {
  const t = useTranslations("garden");
  const [bubble, setBubble] = useState<({ text: string } & Point) | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const lastLine = useRef<LineKey | null>(null);
  const lastAnnounced = useRef(Number.NEGATIVE_INFINITY);
  const bubbleTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(bubbleTimer.current), []);

  const speak = (position: Point) => {
    const line = pickLine(factsOf(scene), lastLine.current);
    lastLine.current = line.key;
    const values = { ...line.values };
    if (typeof values.species === "string") values.species = t(`species.${values.species}`);
    const text = t(`pipo.${line.key}`, values);

    setBubble({ text, ...position });
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), BUBBLE_MS);

    const now = performance.now();
    if (now - lastAnnounced.current >= SCENE.speechAnnounceSeconds * 1000) {
      lastAnnounced.current = now;
      setAnnouncement(text);
    }
  };

  return { bubble, announcement, speak };
}
