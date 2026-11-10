"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useNow } from "@/hooks/use-now";
import { BREAK_MINUTES, formatClock, progress, remainingMs } from "@/lib/pomodoro/timer";
import type { TreeSpecies } from "@/lib/garden/growth";
import type { SessionTree } from "@/lib/pomodoro/grow";
import { usePomodoroStore } from "@/lib/stores/pomodoro";

import { abandonFocus, completeFocus, startFocus } from "../_lib/actions";

const RETRY_MS = 15_000;

function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/**
 * Focus → reward → break cycle. Time is derived from the start time (server time for
 * focus), so the clock stays right across reloads and background tabs.
 */
export function usePomodoro() {
  const t = useTranslations("pomodoro");
  const router = useRouter();
  const store = usePomodoroStore();
  const now = useNow();
  const [isPending, startTransition] = useTransition();
  const [lastReward, setLastReward] = useState<number | null>(null);
  // The completion request must fire once per session, even though `now` ticks every second
  const claimedRef = useRef<string | null>(null);

  // Load the saved timer from localStorage once mounted (avoids a hydration mismatch)
  useEffect(() => {
    void usePomodoroStore.persist.rehydrate();
  }, []);

  const left =
    store.startedAt && now !== null ? remainingMs(store.startedAt, store.minutes, now) : null;
  const done = store.startedAt && now !== null ? progress(store.startedAt, store.minutes, now) : 0;

  // Focus finished: ask the server for the reward, then start the break
  useEffect(() => {
    const sessionId = store.sessionId;
    if (store.phase !== "focus" || left !== 0 || !sessionId || claimedRef.current === sessionId)
      return;
    claimedRef.current = sessionId;

    void completeFocus(sessionId).then((result) => {
      if (result.status === "completed") {
        setLastReward(result.coins);
        toast.success(t("rewardToast", { coins: result.coins }));
        notify(t("focusDoneTitle"), t("rewardToast", { coins: result.coins }));
        usePomodoroStore.getState().startBreak(BREAK_MINUTES);
        // The garden changed: refresh the tree shown on this page
        router.refresh();
      } else if (result.status === "too_early") {
        // Device clock ahead of the server: try again shortly
        setTimeout(() => {
          claimedRef.current = null;
        }, RETRY_MS);
      } else {
        toast.error(t("claimFailed"));
        usePomodoroStore.getState().reset();
      }
    });
  }, [store.phase, store.sessionId, left, t, router]);

  // Break finished: back to idle
  useEffect(() => {
    if (store.phase === "break" && left === 0) {
      notify(t("breakDoneTitle"), t("breakDoneBody"));
      usePomodoroStore.getState().reset();
    }
  }, [store.phase, left, t]);

  // Live countdown in the browser tab title
  useEffect(() => {
    if (store.phase === "idle" || left === null) return;
    const previous = document.title;
    document.title = `${formatClock(left)} · ${t(store.phase === "focus" ? "focus" : "break")}`;
    return () => {
      document.title = previous;
    };
  }, [store.phase, left, t]);

  /** Starts a session of `minutes` that plants a tree of `species`. */
  const start = (minutes: number, species: TreeSpecies) =>
    startTransition(async () => {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      const result = await startFocus({ minutes, species });
      if (result.ok) {
        setLastReward(null);
        store.setPreferredMinutes(minutes);
        store.startFocus({ ...result, tree: { species } });
      } else {
        toast.error(t(result.reason === "locked" ? "tree.lockedError" : "startFailed"));
      }
    });

  /** Leaving early plants nothing; `onWithered` gets the species to show the tree wilting. */
  const giveUp = (onWithered?: (tree: SessionTree) => void) =>
    startTransition(async () => {
      const tree = store.tree;
      if (store.sessionId) await abandonFocus(store.sessionId);
      store.reset();
      if (tree) onWithered?.(tree);
    });

  return {
    phase: store.phase,
    minutes: store.minutes,
    preferredMinutes: store.preferredMinutes,
    setPreferredMinutes: store.setPreferredMinutes,
    tree: store.tree,
    /** null until the clock is available on the client. */
    clock: left === null ? null : formatClock(left),
    progress: done,
    isPending,
    lastReward,
    start,
    giveUp,
    skipBreak: store.reset,
  };
}
