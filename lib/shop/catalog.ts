import type { Database } from "@/types/database";

export type ShopItemKind = Database["public"]["Enums"]["shop_item_kind"];

/**
 * Display data for shop items. Prices live in the database, never here.
 * Garden items show a thumbnail drawn from the garden art (`npm run shop:thumbs`).
 */
export const SHOP_ITEMS = {
  "theme-sakura": { kind: "theme", swatch: "#a8496b" },
  "theme-matcha": { kind: "theme", swatch: "#4d6b2f" },
  "theme-ocean": { kind: "theme", swatch: "#1f6577" },
  "seed-maple": { kind: "seed", image: "/shop/seed-maple.png" },
  "seed-sakura": { kind: "seed", image: "/shop/seed-sakura.png" },
  "deco-pond": { kind: "decoration", image: "/shop/deco-pond.png" },
  "deco-lantern": { kind: "decoration", image: "/shop/deco-lantern.png" },
  "deco-bench": { kind: "decoration", image: "/shop/deco-bench.png" },
  "deco-torii": { kind: "decoration", image: "/shop/deco-torii.png" },
  "deco-bridge": { kind: "decoration", image: "/shop/deco-bridge.png" },
  "deco-cat": { kind: "decoration", image: "/shop/deco-cat.png" },
  "topics-anime": { kind: "topic_pack", topics: ["anime", "manga", "game"] },
  "topics-business": { kind: "topic_pack", topics: ["meeting", "email", "interview"] },
} as const satisfies Record<string, { kind: ShopItemKind } & Record<string, unknown>>;

export type ShopItemId = keyof typeof SHOP_ITEMS;

/** A catalog item as shown in the shop: server price + whether the user owns it. */
export interface ShopEntry {
  id: ShopItemId;
  kind: ShopItemKind;
  price: number;
  owned: boolean;
}

export function isShopItemId(value: string): value is ShopItemId {
  return value in SHOP_ITEMS;
}

/** Extra topic suggestions unlocked by owned topic packs. */
export function unlockedTopics(owned: readonly string[]): string[] {
  return owned.flatMap((id) => {
    const item = isShopItemId(id) ? SHOP_ITEMS[id] : null;
    return item && "topics" in item ? [...item.topics] : [];
  });
}
