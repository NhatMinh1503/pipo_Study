import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";

/** Title block for a lesson's practice modes ("dictation" | "cloze"). */
export async function PracticeHeader({
  mode,
  title,
}: {
  mode: "dictation" | "cloze";
  title: string;
}) {
  const t = await getTranslations(mode);
  return <PageHeader title={t("title")} description={`${title} · ${t("description")}`} />;
}
