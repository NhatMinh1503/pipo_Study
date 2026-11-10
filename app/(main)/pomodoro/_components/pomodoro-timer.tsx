"use client";

import { Coffee, Sprout, Trees } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TreeSpecies } from "@/lib/garden/growth";
import type { SessionTree } from "@/lib/pomodoro/grow";
import { FOCUS_OPTIONS } from "@/lib/pomodoro/timer";
import type { GardenStatus } from "@/server/queries/garden";

import { usePomodoro } from "../_hooks/use-pomodoro";

import { ProgressRing } from "./progress-ring";
import { TreePanel } from "./tree-panel";
import { TreePicker } from "./tree-picker";

interface PomodoroTimerProps {
  garden: GardenStatus;
}

export function PomodoroTimer({ garden }: PomodoroTimerProps) {
  const t = useTranslations("pomodoro");
  const pomodoro = usePomodoro();
  const { phase } = pomodoro;
  const [picked, setPicked] = useState<TreeSpecies>("pine");

  // The tree the next (or current) session tends
  const nextTree: SessionTree = garden.growing
    ? { species: garden.growing.species, fromSessions: garden.growing.sessions }
    : { species: picked, fromSessions: 0 };
  const tree = phase === "idle" ? nextTree : (pomodoro.tree ?? nextTree);

  return (
    <div className="grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <TreePanel phase={phase} tree={tree} progress={pomodoro.progress} />

      <section className="sheet flex flex-col items-center gap-6 p-6">
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
              ? `${String(pomodoro.minutes).padStart(2, "0")}:00`
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
          <TreePicker
            growing={garden.growing}
            ownedItemIds={garden.ownedItemIds}
            value={picked}
            onChange={setPicked}
          />
        )}

        {phase === "idle" && (
          <div className="grid w-full grid-cols-2 gap-3">
            {FOCUS_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                size="lg"
                variant={minutes === 25 ? "default" : "outline"}
                disabled={pomodoro.isPending}
                onClick={() =>
                  pomodoro.start(minutes, garden.growing ? undefined : picked, nextTree)
                }
              >
                {t("startMinutes", { minutes })}
              </Button>
            ))}
          </div>
        )}
        {phase === "focus" && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pomodoro.isPending}
            onClick={pomodoro.giveUp}
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
