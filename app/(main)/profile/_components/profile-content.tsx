import { BookOpenText, Brain, Coins, Flame, NotebookPen, Sparkles, Timer } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { LevelProgress } from "@/components/game/level-progress";
import { avatarUrl as toAvatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { requireOnboardedProfile } from "@/server/profile";
import { getLearnerStats } from "@/server/queries/learner-stats";

import { AvatarUploader } from "./avatar-uploader";
import { DisplayNameForm } from "./display-name-form";

export async function ProfileContent() {
  const [user, profile, stats, t] = await Promise.all([
    requireUser(),
    requireOnboardedProfile(),
    getLearnerStats(),
    getTranslations("profile"),
  ]);
  const { data: wallet } = await (
    await createClient()
  )
    .from("wallet_summaries")
    .select("xp, coins, effective_streak, streak_best, level, stars, xp_into_level, xp_to_next")
    .maybeSingle();

  const avatarUrl = toAvatarUrl(profile.avatar_path);

  return (
    <>
      <PageHeader title={t("title")} description={user.email} />
      <section className="sheet space-y-5 p-5">
        <AvatarUploader userId={user.id} avatarUrl={avatarUrl} />
        <DisplayNameForm initialName={profile.display_name ?? ""} />
      </section>
      <section aria-label={t("statsLabel")} className="space-y-3">
        <h2 className="mono-label">{t("statsLabel")}</h2>
        <div className="sheet-flat grid grid-cols-2 divide-x divide-y divide-dashed divide-border/30 sm:grid-cols-4">
          <StatCard
            label="XP"
            value={wallet?.xp ?? 0}
            icon={Sparkles}
            footer={
              <LevelProgress
                level={wallet?.level ?? 1}
                stars={wallet?.stars ?? 0}
                xpIntoLevel={wallet?.xp_into_level ?? 0}
                xpToNext={wallet?.xp_to_next ?? 50}
              />
            }
          />
          <StatCard label="Coins" value={wallet?.coins ?? 0} icon={Coins} />
          <StatCard
            label={t("streak")}
            value={wallet?.effective_streak ?? 0}
            icon={Flame}
            hint={t("best", { count: wallet?.streak_best ?? 0 })}
          />
          <StatCard label={t("lessons")} value={stats.lessonsCompleted} icon={BookOpenText} />
          <StatCard label={t("words")} value={stats.wordsSaved} icon={NotebookPen} />
          <StatCard label={t("reviews")} value={stats.reviews} icon={Brain} />
          <StatCard label={t("focus")} value={stats.focusSessions} icon={Timer} />
        </div>
      </section>
    </>
  );
}
