"use client";

import { useTranslations } from "next-intl";

import { hasKanji } from "@/lib/nlp/kana";
import { makeCloze } from "@/lib/srs/cloze";
import type { ReviewCard } from "@/lib/srs/types";
import { cn } from "@/lib/utils";

interface FlashcardProps {
  card: ReviewCard;
  flipped: boolean;
  onFlip: () => void;
}

/**
 * Two-sided card. Front: word, reading and the example sentence with the word hidden.
 * Back: meaning, the full sentence and its translation.
 */
export function Flashcard({ card, flipped, onFlip }: FlashcardProps) {
  const t = useTranslations("review");
  const cloze = card.contextSentence ? makeCloze(card.contextSentence, card.term) : null;
  const showReading = card.reading && hasKanji(card.term);

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? t("flipBack") : t("flip")}
      className={cn(
        "flex min-h-72 w-full flex-col items-center justify-center gap-6 border-2 border-border bg-card p-8 text-center shadow-[5px_5px_0_0_var(--shadow-ink)] transition-colors",
        "hover:bg-muted/20 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
      )}
    >
      <div className="space-y-1.5">
        <p
          lang={card.language}
          className="font-heading text-4xl leading-none font-bold tracking-tight"
        >
          {card.term}
        </p>
        {showReading && (
          <p lang="ja" className="text-base text-muted-foreground">
            {card.reading}
          </p>
        )}
      </div>

      {!flipped ? (
        <>
          {cloze && (
            <p
              lang={card.language}
              className="max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              {cloze.text}
            </p>
          )}
          <p className="mono-label">{t("tapToFlip")}</p>
        </>
      ) : (
        <div className="w-full space-y-4 border-t border-dashed border-border/40 pt-6">
          <p className="text-xl leading-snug font-semibold">{card.meaning || t("noMeaning")}</p>
          {card.contextSentence && (
            <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
              <p lang={card.language}>{card.contextSentence}</p>
              {card.contextTranslation && <p>{card.contextTranslation}</p>}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
