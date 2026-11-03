import { useTranslations } from "next-intl";

import type { LessonSource } from "@/lib/lessons/workspace";
import { findOpenSource } from "@/lib/news/open-sources";
import { cn } from "@/lib/utils";

interface SourceAttributionProps {
  source: LessonSource;
  className?: string;
}

/**
 * Credit line the licences require for passages rewritten from open news: the source, a link
 * to it, the licence, and a clear note that pipo edited the text.
 */
export function SourceAttribution({ source, className }: SourceAttributionProps) {
  const t = useTranslations("lessons.source");
  const licenseUrl = findOpenSource(source.url)?.licenseUrl;
  const link = "underline underline-offset-2 hover:text-foreground";

  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {t.rich("adapted", {
        source: () => (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className={link}>
            {source.name}
          </a>
        ),
        license: () =>
          licenseUrl ? (
            <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
              {source.license}
            </a>
          ) : (
            source.license
          ),
      })}
    </p>
  );
}
