"use client";

import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { PlayButton } from "@/components/audio/play-button";
import { Flashcard } from "@/components/flashcard/flashcard";
import { Button } from "@/components/ui/button";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { RATINGS, type Rating } from "@/lib/srs/schedule";
import type { ReviewCard } from "@/lib/srs/types";
import { cn } from "@/lib/utils";

import { useReviewSession } from "../_hooks/use-review-session";

import { ReviewSummary } from "./review-summary";

const RATING_STYLES: Record<Rating, string> = {
  again: "border-destructive/50 text-destructive hover:bg-destructive/[0.08]",
  hard: "border-warning/50 text-warning hover:bg-warning/[0.08]",
  good: "border-success/50 text-success hover:bg-success/[0.08]",
  easy: "border-primary/50 text-primary hover:bg-primary/[0.08]",
};

/** Review screen: Space flips the card, keys 1–4 rate it (Again / Hard / Good / Easy). */
export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const t = useTranslations("review");
  const session = useReviewSession(cards);
  // Keys only work once hydrated; tests (and nothing else) wait for this marker
  const ready = useIsMounted();

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
    <div className="mx-auto w-full max-w-xl space-y-6" data-ready={ready}>
      <p className="mono-label text-center" aria-live="polite">
        {t("remaining", { count: session.remaining })}
      </p>

      <Flashcard card={session.current} flipped={session.flipped} onFlip={session.flip} />
      {/* Outside the card: a button cannot contain another button */}
      {session.flipped && (
        <div className="flex justify-center">
          <PlayButton
            key={session.current.id}
            text={session.current.contextSentence ?? session.current.term}
            language={session.current.language}
          />
        </div>
      )}

      {session.flipped ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t("rateLabel")}>
          {RATINGS.map((rating, index) => (
            <Button
              key={rating}
              variant="outline"
              onClick={() => session.rate(rating)}
              className={cn("h-auto flex-col gap-1 px-1 py-2.5", RATING_STYLES[rating])}
            >
              <span className="text-[0.75rem] font-semibold">{t(`rating.${rating}`)}</span>
              <kbd className="border border-border/40 px-1 font-mono text-[0.5625rem] leading-4 text-muted-foreground">
                {index + 1}
              </kbd>
            </Button>
          ))}
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={session.flip}>
          {t("showAnswer")}
          <kbd className="border border-primary-foreground/40 px-1 font-mono text-[0.625rem] leading-4">
            Space
          </kbd>
        </Button>
      )}

      {session.failed && <FormAlert messageKey="review.saveFailed" />}
      {session.offlineQueued > 0 && (
        <p className="mono-label text-center" role="status">
          {t("offlineQueued", { count: session.offlineQueued })}
        </p>
      )}
    </div>
  );
}
