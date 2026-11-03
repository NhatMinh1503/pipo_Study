"use client";

import { useEffect, useRef, useState } from "react";

import {
  enqueueReview,
  flushPendingReviews,
  readPendingReviews,
  type PendingReview,
} from "@/lib/review/offline-queue";
import type { Rating } from "@/lib/srs/schedule";
import type { ReviewCard } from "@/lib/srs/types";

import { reviewFlashcard } from "../_lib/actions";

export type RatingCounts = Record<Rating, number>;

/**
 * Review queue: flip the current card, rate it, move on. Cards rated "again" return
 * to the end of the queue so they are seen once more in the same session.
 */
export function useReviewSession(initialCards: ReviewCard[]) {
  const [queue, setQueue] = useState(initialCards);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<RatingCounts>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [failed, setFailed] = useState(false);
  // Saves run one after another so two ratings of the same card ("again", then "good")
  // can never reach the server out of order
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [pendingSaves, setPendingSaves] = useState(0);
  const [offlineQueued, setOfflineQueued] = useState(0);

  // Warn before closing the tab while reviews are still being saved
  useEffect(() => {
    if (pendingSaves === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingSaves]);

  // Ratings made offline are kept in localStorage and sent, in order, once back online
  useEffect(() => {
    const send = async (review: PendingReview) =>
      (await reviewFlashcard(review).catch(() => null))?.ok === true;
    const flush = () => {
      saveChain.current = saveChain.current.then(async () => {
        await flushPendingReviews(window.localStorage, send).catch(() => 0);
        setOfflineQueued(readPendingReviews(window.localStorage).length);
      });
    };
    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  const current = queue[0];
  const reviewed = counts.again + counts.hard + counts.good + counts.easy;

  const flip = () => setFlipped((value) => !value);

  const rate = (rating: Rating) => {
    if (!current || !flipped) return;

    // Optimistic: the next card shows immediately while the server saves
    setQueue((previous) => {
      const [first, ...rest] = previous;
      return rating === "again" && first ? [...rest, first] : rest;
    });
    setCounts((previous) => ({ ...previous, [rating]: previous[rating] + 1 }));
    setFlipped(false);

    // The learner never waits: saves queue up in the background, in order
    const cardId = current.id;
    setPendingSaves((count) => count + 1);
    saveChain.current = saveChain.current.then(async () => {
      const queueOffline = () => {
        try {
          enqueueReview(window.localStorage, { cardId, rating });
          setOfflineQueued((count) => count + 1);
        } catch {
          // Storage blocked or full: a throw here would stall every later save in the chain
          setFailed(true);
        }
      };
      if (!navigator.onLine) {
        queueOffline();
      } else {
        // A thrown action means the request never got an answer (connection dropped): keep it
        const result = await reviewFlashcard({ cardId, rating }).catch(
          () => "unreachable" as const,
        );
        if (result === "unreachable") queueOffline();
        else if (!result.ok) setFailed(true);
      }
      setPendingSaves((count) => count - 1);
    });
  };

  return {
    current,
    remaining: queue.length,
    reviewed,
    counts,
    flipped,
    failed,
    offlineQueued,
    isSaving: pendingSaves > 0,
    isDone: queue.length === 0,
    flip,
    rate,
  };
}
