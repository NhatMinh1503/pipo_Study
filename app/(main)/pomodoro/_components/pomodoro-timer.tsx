"use client";

import { Coffee, Sprout, Trees } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useState } from "react";

import type { TreeSpecies } from "@/lib/garden/growth";
import { FOCUS_OPTIONS } from "@/lib/pomodoro/timer";
import type { GardenStatus } from "@/server/queries/garden";

import { usePomodoro } from "../_hooks/use-pomodoro";

import { ProgressRing } from "./progress-ring";
import { TreePicker } from "./tree-picker";

interface PomodoroTimerProps {
  garden: GardenStatus;
}

export function PomodoroTimer({ garden }: PomodoroTimerProps) {
  const t = useTranslations("pomodoro");
  const pomodoro = usePomodoro();
  const { phase } = pomodoro;
  const [species, setSpecies] = useState<TreeSpecies>("pine");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
      <ProgressRing value={phase === "idle" ? 0 : pomodoro.progress}>
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
          value={species}
          onChange={setSpecies}
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
              onClick={() => pomodoro.start(minutes, garden.growing ? undefined : species)}
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
    </div>
  );
}
