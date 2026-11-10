"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  type LevelUpEvent,
  levelUpsKey,
  markLevelUpsSeen,
  useUnseenLevelUps,
} from "@/lib/api/use-level-ups";

import { LevelUpMoment } from "./level-up-moment";

/**
 * Shows each level-up moment once (xp-levels §3.9). Events are marked seen before they are
 * shown, so a reload or a second device never repeats them. Several moments at once queue
 * up and play one after another.
 */
export function LevelUpNotifier() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { data: events } = useUnseenLevelUps();
  const handled = useRef(new Set<string>());
  const [queue, setQueue] = useState<LevelUpEvent[]>([]);

  // Rewards also arrive with page changes (e.g. finishing a lesson opens the result page)
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: levelUpsKey });
  }, [pathname, queryClient]);

  const show = useEffectEvent(async (pending: LevelUpEvent[]) => {
    const fresh = pending.filter((event) => !handled.current.has(event.id));
    if (fresh.length === 0) return;
    fresh.forEach((event) => handled.current.add(event.id));
    try {
      await markLevelUpsSeen(fresh.map((event) => event.id));
    } catch {
      // Not marked: forget them so the next fetch can try again
      fresh.forEach((event) => handled.current.delete(event.id));
      return;
    }
    setQueue((current) => [...current, ...fresh]);
    queryClient.setQueryData(levelUpsKey, []);
  });

  useEffect(() => {
    if (events && events.length > 0) void show(events);
  }, [events]);

  return (
    <LevelUpMoment
      event={queue[0] ?? null}
      onContinue={() => setQueue((current) => current.slice(1))}
    />
  );
}
