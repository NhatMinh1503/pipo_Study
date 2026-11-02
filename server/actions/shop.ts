"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

const itemIdSchema = z.string().min(1).max(40);

const ERRORS: Record<string, string> = {
  "23514": "shop.errors.notEnoughCoins",
  "23505": "shop.errors.alreadyOwned",
};

/** Buys an item; the database checks the price, the balance and duplicates. */
export async function buyItem(itemId: unknown): Promise<ActionResult> {
  const id = itemIdSchema.safeParse(itemId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("buy_item", { p_item_id: id.data });
  if (error) return { ok: false, error: ERRORS[error.code] ?? "errors.unexpected" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Switches the app accent to an owned theme, or back to the default (null). */
export async function setAccent(itemId: unknown): Promise<ActionResult> {
  const id = itemIdSchema.nullable().safeParse(itemId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ accent: id.data })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "errors.unexpected" };

  revalidatePath("/", "layout");
  return { ok: true };
}
