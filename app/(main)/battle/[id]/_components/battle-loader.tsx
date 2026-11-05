import { notFound } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { closeAbandonedBattles } from "@/server/queries/battles";

import { BattleRoom } from "./battle-room";

export async function BattleLoader({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  if (!z.uuid().safeParse(id).success) notFound();
  // Opening a room is one of the moments stale battles are closed (no scheduled job)
  await closeAbandonedBattles();
  return <BattleRoom battleId={id} userId={user.id} />;
}
