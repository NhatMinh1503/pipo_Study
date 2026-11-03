import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOnboardedProfile } from "@/server/profile";

import { HeadlinesSection } from "./headlines-section";
import { OpenNewsSection } from "./open-news-section";

export async function NewsContent() {
  const [profile, t] = await Promise.all([requireOnboardedProfile(), getTranslations("news")]);
  const language = profile.learning_language ?? "ja";

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<Skeleton className="h-80 border-2 border-border" />}>
        <OpenNewsSection language={language} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 border-2 border-border" />}>
        <HeadlinesSection language={language} />
      </Suspense>
    </>
  );
}
