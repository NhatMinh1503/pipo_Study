"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { LearningLanguage } from "@/lib/schemas/common";
import { pickVoice, SPEECH_LANG } from "@/lib/speech/voices";

const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : undefined);

// Voices load asynchronously in most browsers; expose them as an external store
function subscribeVoices(onChange: () => void) {
  const speech = synth();
  speech?.addEventListener("voiceschanged", onChange);
  return () => speech?.removeEventListener("voiceschanged", onChange);
}
let cachedVoices: SpeechSynthesisVoice[] = [];
function getVoices() {
  const next = synth()?.getVoices() ?? [];
  // Keep the same array reference while nothing changed (required by useSyncExternalStore)
  if (next.length !== cachedVoices.length) cachedVoices = next;
  return cachedVoices;
}
const noVoices: SpeechSynthesisVoice[] = [];

// Support is known only in the browser; the server snapshot says "no" so hydration matches
const subscribeNothing = () => () => {};
const isSupported = () => "speechSynthesis" in window;
const isSupportedOnServer = () => false;

export const SPEECH_RATES = [0.6, 0.8, 1] as const;

/**
 * Text-to-speech with the browser's built-in voices (free, offline-capable).
 * Picks the best available voice for the language and supports slower playback.
 */
export function useSpeech(language: LearningLanguage) {
  const voices = useSyncExternalStore(subscribeVoices, getVoices, () => noVoices);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState<(typeof SPEECH_RATES)[number]>(1);

  const voice = pickVoice(voices, language);
  const supported = useSyncExternalStore(subscribeNothing, isSupported, isSupportedOnServer);

  const stop = useCallback(() => {
    synth()?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const speech = synth();
      if (!speech || !text) return;
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG[language];
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      speech.speak(utterance);
    },
    [language, rate, voice],
  );

  // Never keep talking after the component is gone
  useEffect(() => () => synth()?.cancel(), []);

  return { speak, stop, speaking, rate, setRate, supported, hasVoice: voice !== null };
}
