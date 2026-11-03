"use client";

import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/**
 * False during the server render and hydration, true afterwards — without an effect
 * that sets state, so the first client render still matches the server HTML.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
