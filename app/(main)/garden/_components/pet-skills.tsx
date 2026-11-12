"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PETS, type PetId } from "@/lib/garden/pets";

interface PetSkillsProps {
  pets: readonly PetId[];
  disabled: boolean;
  onUse: (petId: PetId) => void;
}

/** One button per owned pet: the keyboard and screen-reader way to see its skill. */
export function PetSkills({ pets, disabled, onUse }: PetSkillsProps) {
  const t = useTranslations("garden.pets");
  const tShop = useTranslations("shop.items");
  if (pets.length === 0) return null;

  return (
    <section aria-labelledby="garden-pets" className="space-y-2">
      <h2 id="garden-pets" className="mono-label">
        {t("title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        {pets.map((petId) => (
          <Button
            key={petId}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onUse(petId)}
          >
            <span className="font-medium">{tShop(`${petId}.name`)}</span>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span>{t(`skill.${PETS[petId].skill}`)}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
