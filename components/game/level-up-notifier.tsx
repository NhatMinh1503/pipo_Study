"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";

import {
  type LevelUpEvent,
  levelUpsKey,
  markLevelUpsSeen,
  useUnseenLevelUps,
} from "@/lib/api/use-level-ups";

const SOURCES = ["sentence_passed", "lesson_bonus", "flashcard_review", "review_clear"] as const;
type Source = (typeof SOURCES)[number];
const isSource = (value: string): value is Source => SOURCES.some((source) => source === value);

/**
 * Shows each level-up moment once (xp-levels §3.9). Events are marked seen before they are
 * shown, so a reload or a second device never repeats them. A plain notice for now; the
 * event data (from/to level, progress, source) is ready for an animation later.
 */
export function LevelUpNotifier() {
  const t = useTranslations("game.levelUp");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { data: events } = useUnseenLevelUps();
  const handled = useRef(new Set<string>());

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
    for (const event of fresh) {
      toast.success(
        event.kind === "star"
          ? t("star", { stars: event.toStars })
          : t("level", { level: event.toLevel }),
        {
          description: isSource(event.sourceReason) ? t(`source.${event.sourceReason}`) : undefined,
        },
      );
    }
    queryClient.setQueryData(levelUpsKey, []);
  });

  useEffect(() => {
    if (events && events.length > 0) void show(events);
  }, [events]);

  return null;
}
