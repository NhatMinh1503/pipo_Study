"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (Screen Wake Lock API). The lock is dropped by the browser
 * when the page is hidden, so it is taken again when the page comes back. No-op where unsupported.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
        else sentinel = lock;
      } catch {
        // Denied (battery saver, not visible): the timer still works, the screen may sleep
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
