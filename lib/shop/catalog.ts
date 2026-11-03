import type { Database } from "@/types/database";

export type ShopItemKind = Database["public"]["Enums"]["shop_item_kind"];

/** Display data for shop items. Prices live in the database, never here. */
export const SHOP_ITEMS = {
  "theme-sakura": { kind: "theme", swatch: "#a8496b" },
  "theme-matcha": { kind: "theme", swatch: "#4d6b2f" },
  "theme-ocean": { kind: "theme", swatch: "#1f6577" },
  "deco-pond": { kind: "decoration", emoji: "🪷" },
  "deco-lantern": { kind: "decoration", emoji: "🏮" },
  "deco-bench": { kind: "decoration", emoji: "🪑" },
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
