"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SessionTree } from "@/lib/pomodoro/grow";
import { clampFocusMinutes, DEFAULT_FOCUS_MINUTES } from "@/lib/pomodoro/timer";

export type PomodoroPhase = "idle" | "focus" | "break";

interface PomodoroState {
  phase: PomodoroPhase;
  /** Server session id while focusing. */
  sessionId: string | null;
  /** Server start time of the focus session, or client start of the break. */
  startedAt: string | null;
  minutes: number;
  /** The session length the learner picked last, offered again next time. */
  preferredMinutes: number;
  /** The tree this focus session plants, so the page can show it growing. */
  tree: SessionTree | null;
  startFocus: (session: {
    id: string;
    startedAt: string;
    minutes: number;
    tree: SessionTree | null;
  }) => void;
  startBreak: (minutes: number) => void;
  setPreferredMinutes: (minutes: number) => void;
  reset: () => void;
}

const idle = {
  phase: "idle" as const,
  sessionId: null,
  startedAt: null,
  minutes: DEFAULT_FOCUS_MINUTES,
  tree: null,
};

/**
 * Pomodoro state shared across pages and kept in localStorage, so the timer survives
 * reloads and navigation. Time left is always derived from `startedAt`, never counted.
 */
export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set) => ({
      ...idle,
      preferredMinutes: DEFAULT_FOCUS_MINUTES,
      startFocus: ({ id, startedAt, minutes, tree }) =>
        set({ phase: "focus", sessionId: id, startedAt, minutes, tree }),
      // The break keeps the tree, now grown, to show what the session planted
      startBreak: (minutes) =>
        set({ phase: "break", sessionId: null, startedAt: new Date().toISOString(), minutes }),
      setPreferredMinutes: (minutes) => set({ preferredMinutes: clampFocusMinutes(minutes) }),
      reset: () => set(idle),
    }),
    {
      name: "pipo-pomodoro",
      // Server and first client render both start idle; the saved state loads after mount
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ phase, sessionId, startedAt, minutes, preferredMinutes, tree }) => ({
        phase,
        sessionId,
        startedAt,
        minutes,
        preferredMinutes,
        tree,
      }),
    },
  ),
);
