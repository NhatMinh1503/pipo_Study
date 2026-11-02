import { ExternalLink, Newspaper, Plus } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/server/profile";
import { getHeadlines, NEWS_SOURCES } from "@/server/queries/news";

export async function NewsContent() {
  const [profile, t, format] = await Promise.all([
    requireOnboardedProfile(),
    getTranslations("news"),
    getFormatter(),
  ]);
  const language = profile.learning_language ?? "ja";
  const items = await getHeadlines(language);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { source: NEWS_SOURCES[language].name })}
      />
      {items.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="sheet-flat divide-y divide-dashed divide-border/30">
          {items.map((item) => (
            <li key={item.url} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p lang={language} className="font-medium">
                  {item.title}
                </p>
                {item.publishedAt && (
                  <p className="mono-label">
                    {format.dateTime(new Date(item.publishedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    {t("read")}
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/lessons/new?${new URLSearchParams({ title: item.title.slice(0, 120) }).toString()}`}
                  >
                    <Plus aria-hidden />
                    {t("makeLesson")}
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("copyrightNote")}</p>
    </>
  );
}
