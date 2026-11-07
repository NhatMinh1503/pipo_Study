"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";

import { battleKey, useBattle, useBattleAnswer } from "@/lib/api/use-battle";
import { HEARTBEAT_INTERVAL_SECONDS, shouldClaimTimeout } from "@/lib/battle/presence";
import type { BattleAnswerResponse } from "@/lib/schemas/battle";
import { claimBattleTimeout, leaveBattle } from "@/server/actions/battle";

import { useBattleChannel } from "./use-battle-channel";
import { useBattleHeartbeat } from "./use-battle-heartbeat";

/** Everything the battle room needs: live state, presence, answering and leaving. */
export function useBattleRoom(battleId: string, userId: string) {
  const queryClient = useQueryClient();
  const battle = useBattle(battleId);
  const answer = useBattleAnswer();
  const [lastResult, setLastResult] = useState<BattleAnswerResponse | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: battleKey(battleId) });
  const { onlineIds, notify } = useBattleChannel(battleId, userId, refresh);

  const state = battle.data ?? null;
  const me = state?.players.find((player) => player.userId === userId) ?? null;
  const opponent = state?.players.find((player) => player.userId !== userId) ?? null;
  const opponentOnline = opponent ? onlineIds.includes(opponent.userId) : false;

  const isOpen = state?.status === "waiting" || state?.status === "active";
  useBattleHeartbeat(battleId, isOpen);

  // An opponent still answering who has dropped off presence: after the timeout, ask the
  // server to close the battle. The server checks their last heartbeat, so this is safe
  // to retry; it only succeeds once they have really been gone for 90 s.
  const opponentAbsent =
    state?.status === "active" && opponent !== null && !opponent.finished && !opponentOnline;
  const tryClaim = useEffectEvent(async (since: number) => {
    if (!shouldClaimTimeout(since, Date.now())) return;
    const result = await claimBattleTimeout(battleId);
    if (result.ok) {
      refresh();
      notify();
    }
  });
  useEffect(() => {
    if (!opponentAbsent) return;
    const since = Date.now();
    const timer = window.setInterval(() => void tryClaim(since), HEARTBEAT_INTERVAL_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [opponentAbsent]);

  const submit = (translation: string) => {
    if (!me) return;
    answer.mutate(
      { battleId, sentenceIndex: me.answered, translation },
      {
        onSuccess: (result) => {
          setLastResult(result);
          refresh();
          notify();
        },
        // A 409 means our view is stale (e.g. the opponent already forfeited)
        onError: refresh,
      },
    );
  };

  const leave = async () => {
    const result = await leaveBattle(battleId);
    if (result.ok) notify();
    return result.ok;
  };

  return {
    state,
    isLoading: battle.isPending,
    me,
    opponent,
    opponentOnline,
    /** The opponent is still answering but has dropped off presence. */
    opponentAbsent,
    submit,
    isSubmitting: answer.isPending,
    submitError: answer.error,
    lastResult,
    leave,
  };
}
