import { isShopItemId, SHOP_ITEMS } from "@/lib/shop/catalog";

/** Decorations that live on the pond or hop along the path instead of taking a slot (spec §3.5). */
const NOT_ON_SLOTS = new Set(["deco-pond", "deco-slime", "deco-bridge"]);

/** Mirrors SQL place_decoration: an owned decoration that can be placed on a slot. */
export function isSlotDecoration(itemId: string): boolean {
  return (
    isShopItemId(itemId) && SHOP_ITEMS[itemId].kind === "decoration" && !NOT_ON_SLOTS.has(itemId)
  );
}
