"use client";

import { useEffect } from "react";

/** Applies the bought accent theme to <html data-accent>; colors live in globals.css. */
export function AccentSync({ accent }: { accent: string | null }) {
  useEffect(() => {
    const root = document.documentElement;
    if (accent) root.dataset.accent = accent;
    else delete root.dataset.accent;
  }, [accent]);
  return null;
}
