"use client";

import { BookmarkPlus, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import { useDictionaryLookup, useExplainWord } from "@/lib/api/use-dictionary";
import { hasKanji } from "@/lib/nlp/kana";
import type { Token } from "@/lib/nlp/token";
import type { LearningLanguage } from "@/lib/schemas/common";
import { addToNotebook } from "@/server/actions/notebook";

export interface WordContext {
  token: Token;
  language: LearningLanguage;
  sentence: string;
  /** Known translation of the sentence, saved with the word when available. */
  sentenceTranslation?: string | null;
  sentenceId?: string;
}

const EXPLAIN_ERRORS: Record<string, string> = {
  RATE_LIMITED: "translate.errors.rateLimited",
  AI_NOT_CONFIGURED: "translate.errors.notConfigured",
};

/** Clickable word: shows reading, part of speech, dictionary meanings, AI explanation, save button. */
export function WordPopup({ context }: { context: WordContext }) {
  const t = useTranslations("dictionary");
  const tRoot = useTranslations();
  const { token, language } = context;
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const word = { term: token.base, reading: token.reading, language };
  const lookup = useDictionaryLookup(word, open);
  const explain = useExplainWord();
  const explanation = lookup.data?.explanation ?? null;
  const showReading = language === "ja" && hasKanji(token.base) && token.reading;

  const save = () =>
    startSaving(async () => {
      const result = await addToNotebook({
        language,
        term: token.base,
        reading: language === "ja" ? token.reading : undefined,
        partOfSpeech: token.pos,
        meaning:
          explanation?.meaning ?? lookup.data?.entries[0]?.senses[0]?.glosses.join(", ") ?? "",
        contextSentence: context.sentence,
        contextTranslation: context.sentenceTranslation ?? undefined,
        sentenceId: context.sentenceId,
      });
      if (result.ok) {
        setSaved(true);
        toast.success(t("saved"));
      } else if (result.error === "notebook.alreadySaved") {
        setSaved(true);
        toast.info(tRoot("notebook.alreadySaved"));
      } else {
        toast.error(tRoot(result.error ?? "errors.unexpected"));
      }
    });

  const askAi = () =>
    explain.mutate(
      { ...word, sentence: context.sentence },
      {
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : "";
          toast.error(tRoot(EXPLAIN_ERRORS[code] ?? "translate.errors.unavailable"));
        },
      },
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 transition-colors hover:bg-primary/10 hover:decoration-primary focus-visible:bg-primary/10 focus-visible:outline-none"
        >
          {token.surface}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        <div className="space-y-1 border-b border-dashed border-border/40 pb-2.5">
          <p
            lang={language}
            className="font-heading text-lg leading-tight font-bold tracking-tight"
          >
            {token.base}
          </p>
          <p className="font-mono text-[0.6875rem] tracking-[0.04em] text-muted-foreground">
            {showReading && <span lang="ja">{token.reading} · </span>}
            {t(`pos.${token.pos}`)}
          </p>
        </div>

        {lookup.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            {explanation && (
              <div className="space-y-1 bg-muted/50 p-2.5 text-sm leading-relaxed">
                <p className="font-semibold">{explanation.meaning}</p>
                {explanation.note && <p className="text-muted-foreground">{explanation.note}</p>}
              </div>
            )}
            {lookup.data && lookup.data.entries.length > 0 && (
              <div className="space-y-1.5">
                <ol className="list-decimal space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {lookup.data.entries[0]?.senses.slice(0, 3).map((sense, index) => (
                    <li key={index} lang="en">
                      {sense.glosses.join("; ")}
                    </li>
                  ))}
                </ol>
                {/* Required attribution for JMdict (CC BY-SA 4.0) */}
                <p className="font-mono text-[0.5625rem] leading-relaxed tracking-[0.02em] text-muted-foreground/80">
                  {t("attribution")}
                </p>
              </div>
            )}
            {!explanation && lookup.data?.entries.length === 0 && (
              <p className="text-sm leading-relaxed text-muted-foreground">{t("noEntry")}</p>
            )}
          </>
        )}

        <p
          lang={language}
          className="rule-dotted pt-2.5 text-xs leading-relaxed text-muted-foreground"
        >
          {context.sentence}
        </p>

        <div className="flex gap-2">
          {!explanation && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={askAi}
              disabled={explain.isPending}
            >
              <Sparkles aria-hidden />
              {t("explain")}
            </Button>
          )}
          <Button size="sm" className="flex-1" onClick={save} disabled={saved || isSaving}>
            {saved ? <Check aria-hidden /> : <BookmarkPlus aria-hidden />}
            {saved ? t("inNotebook") : t("save")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
