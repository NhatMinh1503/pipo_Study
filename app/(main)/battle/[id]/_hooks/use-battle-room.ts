"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { battleKey, useBattle, useBattleAnswer } from "@/lib/api/use-battle";
import type { BattleAnswerResponse } from "@/lib/schemas/battle";
import { leaveBattle } from "@/server/actions/battle";

import { useBattleChannel } from "./use-battle-channel";

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
    opponentOnline: opponent ? onlineIds.includes(opponent.userId) : false,
    submit,
    isSubmitting: answer.isPending,
    submitError: answer.error,
    lastResult,
    leave,
  };
}
