"use client";

import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { Flashcard } from "@/components/flashcard/flashcard";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { RATINGS, type Rating } from "@/lib/srs/schedule";
import type { ReviewCard } from "@/lib/srs/types";
import { cn } from "@/lib/utils";

import { useReviewSession } from "../_hooks/use-review-session";

import { ReviewSummary } from "./review-summary";

const RATING_STYLES: Record<Rating, string> = {
  again: "border-destructive/40 text-destructive hover:bg-destructive/10",
  hard: "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400",
  good: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
  easy: "border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400",
};

/** Review screen: Space flips the card, keys 1–4 rate it (Again / Hard / Good / Easy). */
export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const t = useTranslations("review");
  const session = useReviewSession(cards);

  useHotkeys(
    {
      " ": session.flip,
      "1": () => session.rate("again"),
      "2": () => session.rate("hard"),
      "3": () => session.rate("good"),
      "4": () => session.rate("easy"),
    },
    !session.isDone,
  );

  if (session.isDone || !session.current) {
    return (
      <ReviewSummary counts={session.counts} total={session.reviewed} isSaving={session.isSaving} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {t("remaining", { count: session.remaining })}
      </p>

      <Flashcard card={session.current} flipped={session.flipped} onFlip={session.flip} />

      {session.flipped ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t("rateLabel")}>
          {RATINGS.map((rating, index) => (
            <Button
              key={rating}
              variant="outline"
              onClick={() => session.rate(rating)}
              className={cn("h-auto flex-col gap-0.5 py-3", RATING_STYLES[rating])}
            >
              <span className="font-medium">{t(`rating.${rating}`)}</span>
              <kbd className="text-[10px] text-muted-foreground">{index + 1}</kbd>
            </Button>
          ))}
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={session.flip}>
          {t("showAnswer")} <kbd className="ml-1 text-xs opacity-70">Space</kbd>
        </Button>
      )}

      {session.failed && <FormAlert messageKey="review.saveFailed" />}
    </div>
  );
}
