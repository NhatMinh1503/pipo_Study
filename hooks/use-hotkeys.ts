"use client";

import { useEffect, useEffectEvent } from "react";

type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

/**
 * Global keyboard shortcuts keyed by `KeyboardEvent.key` (e.g. " ", "1", "Enter").
 * Ignored while typing in an input/textarea, while composing IME text, and when `enabled` is false.
 */
export function useHotkeys(map: HotkeyMap, enabled = true) {
  // An effect event always sees the latest handlers, even for keys pressed in quick
  // succession (a ref updated in useEffect would lag one paint behind)
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (typing || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;

    const handler = map[event.key];
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
