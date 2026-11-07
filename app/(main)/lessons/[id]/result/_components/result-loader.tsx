import { Coins, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { VerdictBadge } from "@/components/lessons/verdict-badge";
import { Button } from "@/components/ui/button";
import { scoreLesson } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { getLessonRewardSummary } from "@/server/queries/lesson-reward";
import { getLessonWorkspace, toSentenceAttempts } from "@/server/queries/lesson-workspace";

import { PublishButton } from "./publish-button";

export async function ResultLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const [workspace, t] = await Promise.all([
    getLessonWorkspace(client, id),
    getTranslations("result"),
  ]);
  if (!workspace) notFound();
  if (!workspace.completedAt) redirect(`/lessons/${id}/translate`);

  // Points and verdicts per sentence; the rewards shown are what the server actually paid
  const score = scoreLesson(toSentenceAttempts(workspace));
  const reward = await getLessonRewardSummary(client, workspace.id, workspace.sentences.length);

  return (
    <>
      <PageHeader
        title={score.perfect ? t("titlePerfect") : t("title")}
        description={workspace.title}
      />
      <section
        aria-label={t("statsLabel")}
        className="grid grid-cols-3 border-2 border-border bg-card sm:divide-x sm:divide-dashed sm:divide-border/30"
      >
        <StatCard label={t("score")} value={`${score.percent}%`} icon={Target} />
        <StatCard label={t("xp")} value={`+${reward.xp}`} icon={Sparkles} />
        <StatCard label={t("coins")} value={`+${reward.coins}`} icon={Coins} />
      </section>
      {(reward.capped || reward.tooShort) && (
        <p role="status" className="sheet-flat bg-tint-sand p-3 text-sm">
          {reward.capped ? t("capped") : t("tooShort")}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="mono-label">{t("details")}</h2>
        <ol className="divide-y divide-dashed divide-border/30 border-2 border-border bg-card">
          {workspace.sentences.map((sentence, index) => {
            const sentenceScore = score.sentences[index];
            return (
              <li key={sentence.id} className="space-y-2 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p lang={workspace.language} className="leading-relaxed">
                    {sentence.sourceText}
                  </p>
                  {sentenceScore?.finalVerdict && (
                    <VerdictBadge verdict={sentenceScore.finalVerdict} className="shrink-0" />
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {sentence.referenceTranslation}
                </p>
                <p className="font-mono text-[0.6875rem] tracking-[0.04em] text-muted-foreground">
                  {t("sentenceSummary", {
                    attempts: sentenceScore?.attempts ?? 0,
                    points: sentenceScore?.points ?? 0,
                  })}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/lessons/new">{t("newLesson")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("backHome")}</Link>
        </Button>
        <PublishButton lessonId={workspace.id} />
      </div>
    </>
  );
}
