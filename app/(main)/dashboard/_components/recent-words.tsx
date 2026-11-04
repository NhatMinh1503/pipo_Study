import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { RecentWord } from "../_lib/get-dashboard-data";

/** The last words saved to the notebook, as a quick reminder. */
export async function RecentWords({ words }: { words: RecentWord[] }) {
  const t = await getTranslations("dashboard.words");

  return (
    <section className="sheet flex flex-col" aria-labelledby="recent-words-heading">
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-border/40 px-5 py-3.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <NotebookPen className="size-3.5" aria-hidden />
          <h2 id="recent-words-heading" className="mono-label">
            {t("title")}
          </h2>
        </div>
        <Link href="/notebook" className="mono-label hover:text-foreground">
          {t("all")}
        </Link>
      </header>
      {words.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-dashed divide-border/30">
          {words.map((word) => (
            <li key={word.id} className="flex items-baseline gap-3 px-5 py-2.5">
              <span className="shrink-0 font-medium">{word.term}</span>
              {word.reading && word.reading !== word.term && (
                <span className="mono-label shrink-0 normal-case">{word.reading}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-right text-sm text-muted-foreground">
                {word.meaning}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
