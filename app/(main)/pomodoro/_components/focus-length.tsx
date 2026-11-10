"use client";

import { useTranslations } from "next-intl";

import { FOCUS_PRESETS, FOCUS_RANGE } from "@/lib/pomodoro/timer";
import { cn } from "@/lib/utils";

interface FocusLengthProps {
  minutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}

/** How long the next session lasts (Forest style): quick picks plus a slider, 10–120 min. */
export function FocusLength({ minutes, onChange, disabled = false }: FocusLengthProps) {
  const t = useTranslations("pomodoro.length");

  return (
    <fieldset className="w-full space-y-3" disabled={disabled}>
      <legend className="mono-label mb-2 flex w-full items-baseline justify-between">
        <span>{t("title")}</span>
        <span className="font-heading text-base font-bold text-foreground normal-case tabular-nums">
          {t("minutes", { minutes })}
        </span>
      </legend>
      <div className="grid grid-cols-4 gap-2">
        {FOCUS_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={minutes === preset}
            onClick={() => onChange(preset)}
            className={cn(
              "border-2 border-border py-1.5 font-mono text-sm tabular-nums transition-colors",
              minutes === preset ? "bg-tint-mint font-semibold" : "bg-card hover:bg-muted/60",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={FOCUS_RANGE.min}
        max={FOCUS_RANGE.max}
        step={FOCUS_RANGE.step}
        value={minutes}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={t("slider")}
        aria-valuetext={t("minutes", { minutes })}
        className="w-full accent-[var(--success)]"
      />
    </fieldset>
  );
}
