import { Puzzle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { FormAlert } from "@/components/common/form-alert";
import {
  LEVELS_BY_LANGUAGE,
  proficiencyLevelSchema,
  isLevelForLanguage,
} from "@/lib/schemas/common";
import type { Blank } from "@/lib/cloze/blanks";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getClozeSelector } from "@/server/ai/cloze-selector";
import { requireUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { ClozeError, getClozeBlanks } from "@/server/services/cloze";
import { getTokenizedWorkspace } from "@/server/services/ensure-tokens";
import { createAdminClient } from "@/server/supabase-admin";

import { PracticeHeader } from "../../_components/practice-header";

import { ClozeSession } from "./cloze-session";

interface ClozeLoaderProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function ClozeLoader({ params, searchParams }: ClozeLoaderProps) {
  const [{ id }, query, user, t] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    getTranslations("cloze"),
  ]);
  const userClient = await createClient();
  const workspace = await getTokenizedWorkspace(userClient, id);
  if (!workspace) notFound();

  const requested = proficiencyLevelSchema.safeParse(query.level);
  const level =
    requested.success && isLevelForLanguage(workspace.language, requested.data)
      ? requested.data
      : workspace.level;

  const result = await loadBlanks({
    userClient,
    adminClient: createAdminClient(),
    userId: user.id,
    workspace,
    level,
    select: getClozeSelector(),
    dailyLimit: getServerEnv().AI_DAILY_LIMIT,
  });

  let content: React.ReactNode;
  if ("errorKey" in result) content = <FormAlert messageKey={result.errorKey} />;
  else if (result.blanks.length === 0) {
    content = (
      <EmptyState icon={Puzzle} title={t("noBlanks", { level })} description={t("noBlanksHint")} />
    );
  } else {
    // Keyed by level so switching level resets the answers
    content = <ClozeSession key={level} workspace={workspace} blanks={result.blanks} />;
  }

  return (
    <>
      <PracticeHeader mode="cloze" title={workspace.title} />
      <nav className="flex flex-wrap items-center gap-2" aria-label={t("levelLabel")}>
        <span className="mono-label">{t("levelLabel")}</span>
        {LEVELS_BY_LANGUAGE[workspace.language].map((value) => (
          <Link
            key={value}
            href={`/lessons/${id}/cloze?level=${value}`}
            aria-current={value === level ? "page" : undefined}
            className={cn(
              "mono-value border-2 px-2.5 py-1 text-xs",
              value === level
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted/50",
            )}
          >
            {value}
          </Link>
        ))}
      </nav>
      {content}
    </>
  );
}

/** AI / quota failures become a message instead of an error page. */
async function loadBlanks(
  params: Parameters<typeof getClozeBlanks>[0],
): Promise<{ blanks: Blank[] } | { errorKey: string }> {
  try {
    return { blanks: await getClozeBlanks(params) };
  } catch (error) {
    const code = error instanceof ClozeError || error instanceof AiError ? error.code : "INTERNAL";
    return {
      errorKey:
        code === "RATE_LIMITED" ? "translate.errors.rateLimited" : "translate.errors.unavailable",
    };
  }
}
