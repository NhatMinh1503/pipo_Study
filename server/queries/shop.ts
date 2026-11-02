import "server-only";

import { isShopItemId, type ShopEntry } from "@/lib/shop/catalog";
import { createClient } from "@/lib/supabase/server";

export interface ShopState {
  items: ShopEntry[];
  coins: number;
  accent: string | null;
}

/** Catalog with server prices, what the user owns, their balance and active accent. */
export async function getShopState(): Promise<ShopState> {
  const supabase = await createClient();
  const [items, purchases, wallet, profile] = await Promise.all([
    supabase.from("shop_items").select("id, kind, price").order("sort_order"),
    supabase.from("purchases").select("item_id"),
    supabase.from("wallets").select("coins").maybeSingle(),
    supabase.from("profiles").select("accent").maybeSingle(),
  ]);

  const owned = new Set((purchases.data ?? []).map((row) => row.item_id));
  return {
    items: (items.data ?? []).flatMap((row) =>
      isShopItemId(row.id)
        ? [{ id: row.id, kind: row.kind, price: row.price, owned: owned.has(row.id) }]
        : [],
    ),
    coins: wallet.data?.coins ?? 0,
    accent: profile.data?.accent ?? null,
  };
}

/** IDs of everything the user has bought (decorations, topic packs, themes). */
export async function getOwnedItemIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("purchases").select("item_id");
  return (data ?? []).map((row) => row.item_id);
}
