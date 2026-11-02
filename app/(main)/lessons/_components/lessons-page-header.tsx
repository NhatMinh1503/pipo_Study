import { Newspaper, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

/** Header for the lessons list ("list") and the create form ("new"). */
export async function LessonsPageHeader({ variant }: { variant: "list" | "new" }) {
  const t = await getTranslations("lessons");

  if (variant === "new") {
    return <PageHeader title={t("newTitle")} description={t("newDescription")} />;
  }

  return (
    <PageHeader
      title={t("title")}
      description={t("description")}
      actions={
        <>
          <Button asChild variant="ghost">
            <Link href="/news">
              <Newspaper aria-hidden />
              {t("news")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/lessons/generate">
              <Sparkles aria-hidden />
              {t("generate")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/lessons/new">
              <Plus aria-hidden />
              {t("new")}
            </Link>
          </Button>
        </>
      }
    />
  );
}
