"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Channel = ReturnType<ReturnType<typeof createClient>["channel"]>;

/**
 * Realtime room `battle:<id>`: presence shows whether the opponent is connected, and a
 * "changed" broadcast tells the other player to refetch after any answer, join or leave.
 * State itself always comes from the database; broadcasts only carry the nudge.
 */
export function useBattleChannel(battleId: string, userId: string, onChange: () => void) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<Channel | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const handleChange = useEffectEvent(onChange);

  useEffect(() => {
    const channel = supabase.channel(`battle:${battleId}`, {
      config: { presence: { key: userId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(Object.keys(channel.presenceState()));
        handleChange();
      })
      .on("broadcast", { event: "changed" }, () => handleChange())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ joinedAt: Date.now() });
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [supabase, battleId, userId]);

  const notify = () => {
    void channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} });
  };

  return { onlineIds, notify };
}
