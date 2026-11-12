"use client";

import { Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { SPEECH_RATES, useSpeech } from "@/hooks/use-speech";
import type { LearningLanguage } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

interface PlayButtonProps {
  text: string;
  language: LearningLanguage;
  /** Show the 0.6× / 0.8× / 1× speed switch next to the button. */
  showRate?: boolean;
  /** Icon-only button (e.g. inside the dictionary popup); `label` names it for screen readers. */
  compact?: boolean;
  label?: string;
  className?: string;
}

/** Reads `text` aloud with the device's voice; tap again to stop. */
export function PlayButton({
  text,
  language,
  showRate = false,
  compact = false,
  label,
  className,
}: PlayButtonProps) {
  const t = useTranslations("audio");
  const speech = useSpeech(language);

  if (!speech.supported) return null;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon-sm" : "sm"}
        onClick={() => (speech.speaking ? speech.stop() : speech.speak(text))}
        aria-label={speech.speaking ? t("stop") : (label ?? t("play"))}
        title={speech.hasVoice ? label : t("noVoice")}
      >
        {speech.speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />}
        {!compact && (speech.speaking ? t("stop") : t("play"))}
      </Button>
      {showRate && (
        <div className="flex border border-border/40" role="group" aria-label={t("speed")}>
          {SPEECH_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              aria-pressed={speech.rate === rate}
              onClick={() => speech.setRate(rate)}
              className={cn(
                "mono-value px-2 py-1 text-xs transition-colors",
                speech.rate === rate
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {rate}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
