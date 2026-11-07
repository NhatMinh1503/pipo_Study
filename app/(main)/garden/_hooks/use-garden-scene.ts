"use client";

import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";

import type { Point } from "@/lib/garden/layout";
import type { SceneModel } from "@/lib/garden/scene-model";

import type { GardenRenderer } from "../_lib/garden-renderer";

export type SceneStatus = "loading" | "ready" | "error";

interface UseGardenSceneOptions {
  reducedMotion: boolean;
  onTreeSelect: (treeId: string) => void;
  onPipoSpeak: (position: Point) => void;
}

/**
 * Mounts the PixiJS garden in `host`. pixi.js is loaded with import() here, so it only
 * downloads on the garden page. The scene is rebuilt when the model or motion setting changes.
 */
export function useGardenScene(
  host: RefObject<HTMLDivElement | null>,
  model: SceneModel,
  options: UseGardenSceneOptions,
) {
  const [status, setStatus] = useState<SceneStatus>("loading");
  const renderer = useRef<GardenRenderer | null>(null);
  const selectTree = useEffectEvent(options.onTreeSelect);
  const speak = useEffectEvent(options.onPipoSpeak);
  const { reducedMotion } = options;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let created: GardenRenderer | null = null;

    import("../_lib/garden-renderer")
      .then(({ createGardenRenderer }) =>
        createGardenRenderer(element, model, {
          reducedMotion,
          onTreeSelect: (id) => selectTree(id),
          onPipoSpeak: (position) => speak(position),
        }),
      )
      .then((result) => {
        if (cancelled) {
          result.destroy();
          return;
        }
        created = result;
        renderer.current = result;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      created?.destroy();
      renderer.current = null;
      element.replaceChildren();
    };
  }, [host, model, reducedMotion]);

  return {
    status,
    greetPipo: () => renderer.current?.greetPipo(),
    highlightSlot: (slot: number | null) => renderer.current?.highlightSlot(slot),
  };
}
