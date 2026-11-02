import { notFound } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/server/auth";

import { BattleRoom } from "./battle-room";

export async function BattleLoader({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  if (!z.uuid().safeParse(id).success) notFound();
  return <BattleRoom battleId={id} userId={user.id} />;
}
