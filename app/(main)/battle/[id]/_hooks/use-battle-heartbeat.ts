"use client";

import { useEffect } from "react";

import { HEARTBEAT_INTERVAL_SECONDS } from "@/lib/battle/presence";
import { sendBattleHeartbeat } from "@/server/actions/battle";

/**
 * Tells the server this player still has the room open: once on mount, every
 * HEARTBEAT_INTERVAL_SECONDS, and right away when the tab becomes visible again
 * (background tabs may throttle timers). The server judges absence from these beats.
 */
export function useBattleHeartbeat(battleId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const beat = () => void sendBattleHeartbeat(battleId);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_SECONDS * 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [battleId, enabled]);
}
