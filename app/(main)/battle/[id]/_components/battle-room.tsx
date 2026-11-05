"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { VerdictBadge } from "@/components/lessons/verdict-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useBattleRoom } from "../_hooks/use-battle-room";
import { AnswerForm } from "./answer-form";
import { BattleResult } from "./battle-result";
import { Scoreboard } from "./scoreboard";

interface BattleRoomProps {
  battleId: string;
  userId: string;
}

export function BattleRoom({ battleId, userId }: BattleRoomProps) {
  const t = useTranslations("battle");
  const router = useRouter();
  const room = useBattleRoom(battleId, userId);
  const { state, me } = room;

  if (room.isLoading) return <Skeleton className="h-96 border-2 border-border" />;
  if (!state || !me) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("notFound")} />
        <Button asChild variant="outline">
          <Link href="/battle">{t("backToLobby")}</Link>
        </Button>
      </div>
    );
  }

  const leave = async () => {
    if (await room.leave()) router.push("/battle");
    else toast.error(t("failed"));
  };

  if (state.status === "finished") return <BattleResult state={state} userId={userId} />;

  if (state.status === "cancelled" || state.status === "abandoned") {
    return (
      <div className="space-y-4">
        <PageHeader
          title={state.status === "abandoned" ? t("abandoned") : t("cancelled")}
          description={state.status === "abandoned" ? t("abandonedHint") : undefined}
        />
        <Button asChild>
          <Link href="/battle">{t("backToLobby")}</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "waiting") {
    return (
      <section className="sheet space-y-4 p-6 text-center" aria-live="polite">
        <LoaderCircle className="mx-auto size-8 animate-spin text-primary" aria-hidden />
        <h1 className="font-heading text-xl font-bold">{t("waiting")}</h1>
        <p className="text-sm text-muted-foreground">{t("waitingHint")}</p>
        <Button variant="outline" onClick={leave}>
          {t("cancel")}
        </Button>
      </section>
    );
  }

  const sentence = state.sentences[me.answered];
  const total = state.sentences.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <ConfirmDialog
            title={t("forfeitTitle")}
            description={t("forfeitDescription")}
            confirmLabel={t("forfeit")}
            onConfirm={() => void leave()}
            destructive
          >
            <Button variant="outline" size="sm">
              {t("forfeit")}
            </Button>
          </ConfirmDialog>
        }
      />
      <p className="mono-label" role="note">
        {t("absenceRule")}
      </p>
      {room.opponentAbsent && (
        <p className="sheet-flat bg-tint-sand p-3 text-sm" role="status">
          {t("opponentAbsent")}
        </p>
      )}
      <Scoreboard
        me={me}
        opponent={room.opponent}
        opponentOnline={room.opponentOnline}
        total={total}
      />

      {room.lastResult && (
        <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
          <VerdictBadge verdict={room.lastResult.verdict} />
          <span className="mono-value">+{room.lastResult.points}</span>
          <span className="text-muted-foreground">{room.lastResult.feedback}</span>
        </div>
      )}
      {room.submitError && <p className="text-sm text-destructive">{t("gradeFailed")}</p>}

      {sentence ? (
        <section className="sheet-tight space-y-4 p-5">
          <p className="mono-label">{t("sentence", { index: me.answered + 1, total })}</p>
          <p lang={state.language} className="text-lg leading-relaxed">
            {sentence}
          </p>
          <AnswerForm key={me.answered} isSubmitting={room.isSubmitting} onSubmit={room.submit} />
        </section>
      ) : (
        <p className="sheet-flat p-5 text-center text-muted-foreground" aria-live="polite">
          {t("waitingOpponentFinish")}
        </p>
      )}
    </div>
  );
}
