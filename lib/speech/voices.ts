import type { LearningLanguage } from "@/lib/schemas/common";

export const SPEECH_LANG: Record<LearningLanguage, string> = { ja: "ja-JP", en: "en-US" };

/** Minimal shape of SpeechSynthesisVoice, so the picker is testable without a browser. */
export interface VoiceLike {
  lang: string;
  name: string;
  localService: boolean;
}

// Higher-quality voices on common platforms (macOS/iOS premium, Chrome's Google voices)
const QUALITY_HINTS = /premium|enhanced|natural|neural|google|kyoko|o-ren|samantha|ava/i;

/**
 * Picks the best voice for a language: exact locale over same language,
 * known high-quality voices first, then on-device voices (no network needed).
 */
export function pickVoice<T extends VoiceLike>(
  voices: readonly T[],
  language: LearningLanguage,
): T | null {
  const locale = SPEECH_LANG[language].toLowerCase();
  const prefix = language;

  const score = (voice: T) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    if (!lang.startsWith(prefix)) return -1;
    return (
      (lang === locale ? 4 : 0) +
      (QUALITY_HINTS.test(voice.name) ? 2 : 0) +
      (voice.localService ? 1 : 0)
    );
  };

  let best: T | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const value = score(voice);
    if (value > bestScore) {
      best = voice;
      bestScore = value;
    }
  }
  return best;
}
