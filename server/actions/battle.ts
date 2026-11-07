"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { pickPassage } from "@/lib/battle/passages";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardedProfile } from "@/server/profile";

/** Finds an opponent learning the same language (or opens a waiting room) and enters it. */
export async function findBattle(): Promise<ActionResult> {
  const profile = await requireOnboardedProfile();
  const { learning_language: language, level } = profile;
  if (!language || !level) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { data: battleId, error } = await supabase.rpc("join_battle", {
    p_language: language,
    p_level: level,
    p_sentences: pickPassage(language, level),
  });
  if (error || !battleId) return { ok: false, error: "errors.unexpected" };
  redirect(`/battle/${battleId}`);
}

/** Cancels a waiting battle or forfeits an active one. */
export async function leaveBattle(battleId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(battleId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_battle", { p_battle_id: id.data });
  return error ? { ok: false, error: "errors.unexpected" } : { ok: true };
}

/** "I still have this battle open." Sent about every 15 s by the battle room. */
export async function sendBattleHeartbeat(battleId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(battleId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("battle_heartbeat", { p_battle_id: id.data });
  return error ? { ok: false, error: "errors.unexpected" } : { ok: true };
}

/**
 * Asks the server to close the battle because the opponent has been absent too long.
 * `ok: true` only when the battle was closed in the caller's favour.
 */
export async function claimBattleTimeout(battleId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(battleId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { data: claimed, error } = await supabase.rpc("claim_battle_timeout", {
    p_battle_id: id.data,
  });
  if (error) return { ok: false, error: "errors.unexpected" };
  return claimed ? { ok: true } : { ok: false };
}
