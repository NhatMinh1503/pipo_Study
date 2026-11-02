"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FOCUS_OPTIONS } from "@/lib/pomodoro/timer";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/server/logger";

const log = logger.child({ module: "pomodoro" });

const startSchema = z.union(FOCUS_OPTIONS.map((minutes) => z.literal(minutes)));

export type StartFocusResult =
  { ok: true; id: string; startedAt: string; minutes: number } | { ok: false };

/** Starts a focus session; the server records the start time. */
export async function startFocus(minutes: unknown): Promise<StartFocusResult> {
  const parsed = startSchema.safeParse(minutes);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_pomodoro", { p_planned_minutes: parsed.data });
  if (error || !data) {
    log.error("start failed", { code: error?.code });
    return { ok: false };
  }
  return { ok: true, id: data.id, startedAt: data.started_at, minutes: data.planned_minutes };
}

export type CompleteFocusResult =
  { status: "completed"; coins: number } | { status: "too_early" } | { status: "error" };

/** Claims the reward; the server re-checks that enough time has passed. */
export async function completeFocus(sessionId: unknown): Promise<CompleteFocusResult> {
  const id = z.uuid().safeParse(sessionId);
  if (!id.success) return { status: "error" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_pomodoro", { p_session_id: id.data });
  if (error) {
    log.warn("complete failed", { code: error.code });
    return { status: "error" };
  }
  if (data === null) return { status: "too_early" };

  revalidatePath("/garden");
  revalidatePath("/dashboard");
  return { status: "completed", coins: data };
}

export async function abandonFocus(sessionId: unknown) {
  const id = z.uuid().safeParse(sessionId);
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("abandon_pomodoro", { p_session_id: id.data });
}
