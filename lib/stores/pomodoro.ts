"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PomodoroPhase = "idle" | "focus" | "break";

interface PomodoroState {
  phase: PomodoroPhase;
  /** Server session id while focusing. */
  sessionId: string | null;
  /** Server start time of the focus session, or client start of the break. */
  startedAt: string | null;
  minutes: number;
  startFocus: (session: { id: string; startedAt: string; minutes: number }) => void;
  startBreak: (minutes: number) => void;
  reset: () => void;
}

const idle = { phase: "idle" as const, sessionId: null, startedAt: null, minutes: 25 };

/**
 * Pomodoro state shared across pages and kept in localStorage, so the timer survives
 * reloads and navigation. Time left is always derived from `startedAt`, never counted.
 */
export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set) => ({
      ...idle,
      startFocus: ({ id, startedAt, minutes }) =>
        set({ phase: "focus", sessionId: id, startedAt, minutes }),
      startBreak: (minutes) =>
        set({ phase: "break", sessionId: null, startedAt: new Date().toISOString(), minutes }),
      reset: () => set(idle),
    }),
    {
      name: "pipo-pomodoro",
      // Server and first client render both start idle; the saved state loads after mount
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ phase, sessionId, startedAt, minutes }) => ({
        phase,
        sessionId,
        startedAt,
        minutes,
      }),
    },
  ),
);
