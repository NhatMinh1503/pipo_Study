import { BookOpenText, Brain, Coins, Flame, NotebookPen, Sparkles, Timer } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { publicEnv } from "@/lib/env";
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
    .from("wallets")
    .select("xp, coins, streak_current, streak_best")
    .maybeSingle();

  const avatarUrl = profile.avatar_path
    ? `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_path}`
    : null;

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
          <StatCard label="XP" value={wallet?.xp ?? 0} icon={Sparkles} />
          <StatCard label="Coins" value={wallet?.coins ?? 0} icon={Coins} />
          <StatCard
            label={t("streak")}
            value={wallet?.streak_current ?? 0}
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
