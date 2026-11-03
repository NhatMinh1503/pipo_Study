"use client";

import { useEffect } from "react";

import { PAGE_CACHE } from "@/lib/pwa/constants";

/**
 * Drops pages cached for offline use. Rendered on sign-in screens, which is where every
 * sign-out lands, so the next person on a shared device cannot read someone's notebook.
 */
export function ClearOfflinePages() {
  useEffect(() => {
    if ("caches" in window) void caches.delete(PAGE_CACHE);
  }, []);

  return null;
}
