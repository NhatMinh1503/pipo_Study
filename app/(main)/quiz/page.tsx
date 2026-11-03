import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listVocabItems } from "@/server/queries/vocab";

import { QuizView } from "./_components/quiz-view";

export const metadata: Metadata = { title: "Quiz" };

async function QuizLoader() {
  const [items, t] = await Promise.all([listVocabItems(), getTranslations("quiz")]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <QuizView items={items} />
    </>
  );
}

export default function QuizPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-80 border-2 border-border" />}>
        <QuizLoader />
      </Suspense>
    </PageContainer>
  );
}
