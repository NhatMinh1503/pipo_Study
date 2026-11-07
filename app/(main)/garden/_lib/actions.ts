"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { GAME } from "@/lib/game/config";
import { createClient } from "@/lib/supabase/server";

const placeSchema = z.object({
  itemId: z.string().min(1).max(60),
  garden: z.number().int().min(1),
  slot: z
    .number()
    .int()
    .min(0)
    .max(GAME.garden.decorSlots - 1),
});

/** Places (or moves) an owned decoration; the server checks ownership and free slots. */
export async function placeDecoration(input: unknown): Promise<ActionResult> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("place_decoration", {
    p_item_id: parsed.data.itemId,
    p_garden_index: parsed.data.garden,
    p_slot_index: parsed.data.slot,
  });
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "garden.decor.slotTaken" : "errors.unexpected",
    };
  revalidatePath("/garden");
  return { ok: true };
}

/** Puts a decoration back in storage. */
export async function removeDecoration(itemId: unknown): Promise<ActionResult> {
  const parsed = z.string().min(1).max(60).safeParse(itemId);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_decoration", { p_item_id: parsed.data });
  if (error) return { ok: false, error: "errors.unexpected" };
  revalidatePath("/garden");
  return { ok: true };
}
