import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { listVocabItems } from "@/server/queries/vocab";

import { NotebookView } from "./notebook-view";

export async function NotebookContent() {
  const [items, t] = await Promise.all([listVocabItems(), getTranslations("notebook")]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline">
            <Link href="/quiz">{t("quiz")}</Link>
          </Button>
        }
      />
      <NotebookView items={items} />
    </>
  );
}
