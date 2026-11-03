"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production builds only: in dev a cache-first worker would serve
 * stale chunks after every edit.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is an enhancement; the app works without it
    });
  }, []);

  return null;
}
