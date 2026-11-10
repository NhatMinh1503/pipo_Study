"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LevelUpEvent } from "@/lib/api/use-level-ups";

const SOURCES = ["sentence_passed", "lesson_bonus", "flashcard_review", "review_clear"] as const;
type Source = (typeof SOURCES)[number];
const isSource = (value: string): value is Source => SOURCES.some((source) => source === value);

/** Sunburst rays behind Pipo, as in the level-up mockup. */
const RAYS = [
  "M130 130 L120 0 L140 0 Z",
  "M130 130 L260 120 L260 140 Z",
  "M130 130 L140 260 L120 260 Z",
  "M130 130 L0 140 L0 120 Z",
  "M130 130 L220 30 L234 44 Z",
  "M130 130 L230 220 L216 234 Z",
  "M130 130 L40 230 L26 216 Z",
  "M130 130 L30 40 L44 26 Z",
];
const PETALS = [
  { left: 8, delay: 0, duration: 6 },
  { left: 22, delay: -2, duration: 7 },
  { left: 41, delay: -3.4, duration: 5.6 },
  { left: 63, delay: -1, duration: 6.6 },
  { left: 78, delay: -4.2, duration: 7.4 },
  { left: 91, delay: -2.8, duration: 6.2 },
];

interface LevelUpMomentProps {
  /** The moment shown now; null closes the dialog. */
  event: LevelUpEvent | null;
  onContinue: () => void;
}

/**
 * The level-up moment (xp-levels §3.9): Pipo hops in front of a turning sunburst, a stamp
 * lands with the new level and petals fall. Decorative motion stops under reduced motion;
 * the title and description carry the whole message for screen readers.
 */
export function LevelUpMoment({ event, onContinue }: LevelUpMomentProps) {
  const t = useTranslations("game.levelUp");
  const open = event !== null;

  return (
    <>
      {open &&
        createPortal(
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
            {PETALS.map((petal) => (
              <span
                key={petal.left}
                className="anim-petal absolute top-0 block h-2.5 w-3.5 rounded-[12px_0_12px_0] border-[1.5px] border-[#17150f] bg-[#f2a7b6] opacity-0"
                style={
                  {
                    left: `${petal.left}%`,
                    "--petal-delay": `${petal.delay}s`,
                    "--petal-duration": `${petal.duration}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>,
          document.body,
        )}
      <Dialog open={open} onOpenChange={(next) => !next && onContinue()}>
        <DialogContent
          showCloseButton={false}
          className="flex flex-col items-center gap-4 border-4 border-[#17150f] bg-card px-5 pt-8 pb-6 text-center shadow-[10px_10px_0_0_#17150f] sm:max-w-xl sm:px-9"
        >
          {event && (
            <>
              <div className="relative grid h-48 w-56 place-items-center">
                <svg
                  aria-hidden
                  viewBox="0 0 260 260"
                  className="anim-burst absolute -top-6 left-0 size-56"
                >
                  <g fill="#fbe7a8" stroke="#17150f" strokeWidth={2}>
                    {RAYS.map((ray) => (
                      <path key={ray} d={ray} />
                    ))}
                  </g>
                </svg>
                <Image
                  src="/icons/icon-source.png"
                  alt=""
                  width={300}
                  height={300}
                  className="anim-hop relative size-36 rounded-full border-4 border-[#17150f] bg-white object-cover"
                />
                <div
                  aria-hidden
                  className="anim-stamp absolute -right-10 bottom-0 flex size-24 rotate-[-8deg] flex-col items-center justify-center rounded-full border-4 border-[#17150f] bg-[#f2b731] text-[#17150f] shadow-[4px_4px_0_0_#17150f]"
                >
                  <span className="font-mono text-xs font-bold">
                    {event.kind === "star" ? "★" : "LEVEL"}
                  </span>
                  <span className="font-display text-4xl leading-none">
                    {event.kind === "star" ? event.toStars : event.toLevel}
                  </span>
                </div>
              </div>

              <p className="font-mono text-xs font-semibold tracking-[0.16em] text-primary">
                {t("kicker")}
              </p>
              <DialogTitle className="text-2xl font-bold sm:text-3xl">
                {event.kind === "star"
                  ? t("star", { stars: event.toStars })
                  : t("from", { from: event.fromLevel, to: event.toLevel })}
              </DialogTitle>
              <DialogDescription className="max-w-md text-base leading-relaxed">
                {isSource(event.sourceReason) ? t(`source.${event.sourceReason}`) : t("generic")}
              </DialogDescription>

              <ul className="mt-1 grid w-full grid-cols-3 gap-2.5">
                {[
                  {
                    value: event.kind === "star" ? `★${event.toStars}` : `Lv ${event.toLevel}`,
                    label: t("tiles.level"),
                    tint: "bg-tint-sand",
                  },
                  { value: event.xpTotal, label: t("tiles.total"), tint: "bg-tint-blush" },
                  {
                    value: Math.max(0, event.xpToNext - event.xpIntoLevel),
                    label: t("tiles.toNext"),
                    tint: "bg-tint-slate",
                  },
                ].map((tile) => (
                  <li
                    key={tile.label}
                    className={`flex flex-col items-center gap-1 border-[3px] border-[#17150f] p-2.5 ${tile.tint}`}
                  >
                    <span className="font-display text-xl sm:text-2xl">{tile.value}</span>
                    <span className="text-xs font-semibold sm:text-sm">{tile.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-1.5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={onContinue}
                  className="min-h-12 border-[3px] border-[#17150f] bg-[#f2b731] px-5 font-mono text-[15px] font-bold text-[#17150f] shadow-[4px_4px_0_0_#17150f] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-0.5 active:shadow-[2px_2px_0_0_#17150f]"
                >
                  {t("continue")}
                </button>
                <Link
                  href="/profile"
                  onClick={onContinue}
                  className="inline-flex min-h-12 items-center border-[3px] border-[#17150f] bg-card px-5 font-mono text-[15px] font-bold shadow-[4px_4px_0_0_#17150f] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-0.5"
                >
                  {t("toProfile")}
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
