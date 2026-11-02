"use client";

import { NotebookPen, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { LEARNING_LANGUAGES } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";
import { filterVocab, type VocabFilter } from "@/lib/vocab/filter";
import type { VocabItem } from "@/lib/vocab/types";

import { VocabCard } from "./vocab-card";

/** Searchable, language-filtered list of saved words. Filtering runs instantly in the browser. */
export function NotebookView({ items }: { items: VocabItem[] }) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<VocabFilter["language"]>("all");
  const deferredQuery = useDeferredValue(query);
  const visible = useMemo(
    () => filterVocab(items, { query: deferredQuery, language }),
    [items, deferredQuery, language],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title={t("notebook.empty")}
        description={t("notebook.emptyHint")}
      />
    );
  }

  const filters = ["all", ...LEARNING_LANGUAGES] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("notebook.search")}
            aria-label={t("notebook.search")}
            className="pl-7"
          />
        </div>
        {/* Index tabs: the selected language is the open drawer */}
        <div
          className="flex shrink-0 border-2 border-border bg-card"
          role="group"
          aria-label={t("notebook.filterLabel")}
        >
          {filters.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={language === value}
              onClick={() => setLanguage(value)}
              className={cn(
                "border-r border-dashed border-border/35 px-3 py-2 font-mono text-[0.625rem] font-semibold tracking-[0.1em] uppercase transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                language === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {value === "all" ? t("notebook.all") : t(`languages.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="mono-label">{t("notebook.count", { count: visible.length })}</p>

      {visible.length === 0 ? (
        <EmptyState icon={Search} title={t("notebook.noMatch")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id}>
              <VocabCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
