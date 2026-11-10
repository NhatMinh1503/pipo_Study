"use client";

import { Coffee, Sprout, Trees } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TreeSpecies } from "@/lib/garden/growth";
import type { GardenStatus } from "@/server/queries/garden";

import { usePomodoro } from "../_hooks/use-pomodoro";

import { FocusLength } from "./focus-length";
import { ProgressRing } from "./progress-ring";
import { TreePanel } from "./tree-panel";
import { TreePicker } from "./tree-picker";

interface PomodoroTimerProps {
  garden: GardenStatus;
}

/** How long a tree left behind by giving up stays on screen, wilting. */
const WITHERED_MS = 4000;

export function PomodoroTimer({ garden }: PomodoroTimerProps) {
  const t = useTranslations("pomodoro");
  const pomodoro = usePomodoro();
  const { phase } = pomodoro;
  const [picked, setPicked] = useState<TreeSpecies>("pine");
  const [withered, setWithered] = useState<TreeSpecies | null>(null);

  useEffect(() => {
    if (!withered) return;
    const timer = setTimeout(() => setWithered(null), WITHERED_MS);
    return () => clearTimeout(timer);
  }, [withered]);

  // The species on screen: the running session's tree, the wilting one, or the next seed
  const species = phase === "idle" ? (withered ?? picked) : (pomodoro.tree?.species ?? picked);
  const minutes = phase === "idle" ? pomodoro.preferredMinutes : pomodoro.minutes;

  return (
    <div className="grid w-full max-w-5xl min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <TreePanel
        phase={phase}
        species={species}
        progress={pomodoro.progress}
        minutes={minutes}
        withered={phase === "idle" && withered !== null}
      />

      <section className="sheet flex min-w-0 flex-col items-center gap-6 p-6">
        <ProgressRing value={phase === "idle" ? 0 : pomodoro.progress} className="max-w-56">
          {phase === "break" ? (
            <Coffee className="size-5 text-muted-foreground" aria-hidden />
          ) : (
            <Sprout className="size-5 text-success" aria-hidden />
          )}
          <p
            className="font-heading text-5xl leading-none font-bold tracking-tight tabular-nums"
            role="timer"
            aria-label={t("timeLeft")}
          >
            {phase === "idle"
              ? `${String(minutes).padStart(2, "0")}:00`
              : (pomodoro.clock ?? "--:--")}
          </p>
          <p className="mono-label">{t(phase === "idle" ? "ready" : phase)}</p>
        </ProgressRing>

        {pomodoro.lastReward !== null && phase !== "focus" && (
          <p className="mono-label text-center text-success" role="status">
            {t("rewardToast", { coins: pomodoro.lastReward })}
          </p>
        )}

        {phase === "idle" && (
          <>
            <FocusLength
              minutes={minutes}
              onChange={pomodoro.setPreferredMinutes}
              disabled={pomodoro.isPending}
            />
            <TreePicker
              ownedItemIds={garden.ownedItemIds}
              value={picked}
              onChange={setPicked}
              disabled={pomodoro.isPending}
            />
            <Button
              size="lg"
              className="w-full"
              disabled={pomodoro.isPending}
              onClick={() => pomodoro.start(minutes, picked)}
            >
              {t("startMinutes", { minutes })}
            </Button>
          </>
        )}
        {phase === "focus" && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pomodoro.isPending}
            onClick={() => pomodoro.giveUp((tree) => setWithered(tree.species))}
          >
            {t("giveUp")}
          </Button>
        )}
        {phase === "break" && (
          <Button variant="outline" size="lg" className="w-full" onClick={pomodoro.skipBreak}>
            {t("skipBreak")}
          </Button>
        )}

        <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          {phase === "focus" ? t("focusHint") : t("idleHint")}
        </p>

        <Button asChild variant="ghost">
          <Link href="/garden">
            <Trees aria-hidden />
            {t("toGarden")}
          </Link>
        </Button>
      </section>
    </div>
  );
}
