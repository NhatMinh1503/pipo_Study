"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { GAME } from "@/lib/game/config";
import type { GardenScene } from "@/server/queries/garden";

import { placeDecoration, removeDecoration } from "../_lib/actions";

const STORAGE = "storage";

interface DecorationsPanelProps {
  scene: GardenScene;
  /** Highlights a slot in the scene while the learner picks one (null clears it). */
  onHighlight: (slot: number | null) => void;
}

/**
 * Arranging decorations (garden-scene spec §3.5, §7): one labelled select per owned
 * decoration, so it works the same with a mouse, a keyboard or a screen reader.
 */
export function DecorationsPanel({ scene, onHighlight }: DecorationsPanelProps) {
  const t = useTranslations("garden.decor");
  const items = useTranslations("shop.items");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (scene.placeable.length === 0) return null;

  const occupant = (slot: number) =>
    scene.decorations.find((decoration) => decoration.slot === slot)?.itemId ?? null;

  const move = (itemId: string, value: string) =>
    startTransition(async () => {
      const result =
        value === STORAGE
          ? await removeDecoration(itemId)
          : await placeDecoration({ itemId, garden: scene.gardenIndex, slot: Number(value) });
      onHighlight(null);
      if (!result.ok)
        toast.error(t(result.error === "garden.decor.slotTaken" ? "slotTaken" : "failed"));
      router.refresh();
    });

  return (
    <section aria-labelledby="garden-decor" className="space-y-2">
      <h2 id="garden-decor" className="mono-label">
        {t("title")}
      </h2>
      <ul className="sheet-flat divide-y divide-dashed divide-border/30">
        {scene.placeable.map((item) => {
          const here = item.garden === scene.gardenIndex ? item.slot : null;
          const name = items(`${item.itemId}.name`);
          return (
            <li
              key={item.itemId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm"
            >
              <label htmlFor={`decor-${item.itemId}`} className="font-medium">
                {name}
              </label>
              <select
                id={`decor-${item.itemId}`}
                aria-label={t("placeLabel", { item: name })}
                value={here === null ? STORAGE : String(here)}
                disabled={isPending}
                onFocus={() => onHighlight(here)}
                onBlur={() => onHighlight(null)}
                onChange={(event) => move(item.itemId, event.target.value)}
                className="border-2 border-border bg-card px-2 py-1"
              >
                <option value={STORAGE}>
                  {item.garden && item.garden !== scene.gardenIndex
                    ? t("otherGarden", { garden: item.garden })
                    : t("storage")}
                </option>
                {Array.from({ length: GAME.garden.decorSlots }, (_, slot) => {
                  const taken = occupant(slot);
                  return (
                    <option
                      key={slot}
                      value={slot}
                      disabled={taken !== null && taken !== item.itemId}
                    >
                      {taken && taken !== item.itemId
                        ? t("slotTakenBy", { slot: slot + 1, item: items(`${taken}.name`) })
                        : t("slot", { slot: slot + 1 })}
                    </option>
                  );
                })}
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
