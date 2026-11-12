"use client";

import { BookmarkPlus, Check, CornerDownRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PlayButton } from "@/components/audio/play-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import {
  useDictionaryLookup,
  useExplainWord,
  useIsWarmingVocabulary,
} from "@/lib/api/use-dictionary";
import { hasKanji } from "@/lib/nlp/kana";
import type { Token } from "@/lib/nlp/token";
import type { LearningLanguage } from "@/lib/schemas/common";
import type { EnglishEntry } from "@/lib/schemas/dictionary";
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
  const isWarming = useIsWarmingVocabulary();
  const explanation = lookup.data?.explanation ?? null;
  const english = lookup.data?.english ?? [];
  const showReading = language === "ja" && hasKanji(token.base) && token.reading;
  const ipa = language === "en" ? (lookup.data?.ipa ?? null) : null;
  // English tokens carry no part of speech; the dictionary's most common sense supplies it
  const pos = token.pos === "other" ? (english[0]?.senses[0]?.pos ?? token.pos) : token.pos;
  const hasOfflineEntry = (lookup.data?.entries.length ?? 0) > 0 || english.length > 0;

  const save = () =>
    startSaving(async () => {
      const result = await addToNotebook({
        language,
        term: token.base,
        reading: language === "ja" ? token.reading : undefined,
        partOfSpeech: pos,
        meaning:
          explanation?.meaning ??
          english[0]?.senses[0]?.gloss ??
          lookup.data?.entries[0]?.senses[0]?.glosses.join(", ") ??
          "",
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
        <div className="flex items-start justify-between gap-2 border-b border-dashed border-border/40 pb-2.5">
          <div className="min-w-0 space-y-1">
            <p
              lang={language}
              className="font-heading text-lg leading-tight font-bold tracking-tight"
            >
              {token.base}
            </p>
            <p className="font-mono text-[0.6875rem] tracking-[0.04em] text-muted-foreground">
              {showReading && <span lang="ja">{token.reading} · </span>}
              {ipa && <span>/{ipa}/ · </span>}
              {t(`pos.${pos}`)}
              {english[0]?.oxford && english[0].inflection === null && (
                <span className="ml-1.5 border border-primary/40 px-1 text-primary">
                  {t("oxford")}
                </span>
              )}
            </p>
          </div>
          <PlayButton text={token.base} language={language} compact label={t("listen")} />
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
            {english.length > 0 && <EnglishEntries entries={english} />}
            {!explanation && isWarming && (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("preparing")}</p>
            )}
            {!explanation && !hasOfflineEntry && !isWarming && (
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
          <Button
            size="sm"
            className="flex-1"
            onClick={save}
            disabled={saved || isSaving || lookup.isPending}
          >
            {saved ? <Check aria-hidden /> : <BookmarkPlus aria-hidden />}
            {saved ? t("inNotebook") : t("save")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Offline English senses: lemma line for inflected forms, then senses grouped by part of speech. */
function EnglishEntries({ entries }: { entries: EnglishEntry[] }) {
  const t = useTranslations("dictionary");
  return (
    <div className="space-y-2">
      {entries.map((entry, entryIndex) => {
        // The second entry is a pointer ("see also running"), so it gets one sense
        const senses = entry.senses.slice(0, entryIndex === 0 ? 3 : 1);
        return (
          <div key={entry.word} className="space-y-1">
            {entry.inflection && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CornerDownRight className="size-3 shrink-0" aria-hidden />
                <span>
                  {t.rich(`inflection.${entry.inflection}`, {
                    lemma: entry.word,
                    b: (chunks) => (
                      <span lang="en" className="font-semibold text-foreground">
                        {chunks}
                      </span>
                    ),
                  })}
                </span>
                {entry.ipa && <span className="font-mono">/{entry.ipa}/</span>}
              </p>
            )}
            {!entry.inflection && entryIndex > 0 && (
              <p lang="en" className="text-xs font-semibold">
                {entry.word}
              </p>
            )}
            <ol className="space-y-1 text-sm leading-relaxed text-muted-foreground">
              {senses.map((sense, index) => (
                <li key={index}>
                  <span className="mr-1 font-mono text-[0.625rem] tracking-[0.04em] uppercase">
                    {t(`pos.${sense.pos}`)}
                  </span>
                  <span lang="en">{sense.gloss}</span>
                  {sense.example && entryIndex === 0 && index === 0 && (
                    <span lang="en" className="block text-xs italic">
                      “{sense.example}”
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      {/* Required attribution: WordNet license, ECDICT (MIT), CMUdict (BSD) */}
      <p className="font-mono text-[0.5625rem] leading-relaxed tracking-[0.02em] text-muted-foreground/80">
        {t("englishAttribution")}
      </p>
    </div>
  );
}
