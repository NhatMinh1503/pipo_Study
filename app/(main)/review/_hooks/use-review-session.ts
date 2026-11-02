"use client";

import { useEffect, useRef, useState } from "react";

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

  // Warn before closing the tab while reviews are still being saved
  useEffect(() => {
    if (pendingSaves === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingSaves]);

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
      const result = await reviewFlashcard({ cardId, rating }).catch(() => null);
      if (!result?.ok) setFailed(true);
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
    isSaving: pendingSaves > 0,
    isDone: queue.length === 0,
    flip,
    rate,
  };
}
