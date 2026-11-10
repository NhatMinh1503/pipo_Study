import Image from "next/image";

import { assetUrl, gardenAsset } from "@/lib/garden/assets";
import type { TreeSpecies } from "@/lib/garden/growth";
import type { TreeLayer } from "@/lib/pomodoro/grow";
import { cn } from "@/lib/utils";

interface GrowingTreeSceneProps {
  species: TreeSpecies;
  /** The one picture of the tree; null shows bare soil. */
  tree: TreeLayer | null;
  /** Wind and drifting leaves while a session or break runs. */
  windy: boolean;
  /** Sparkles around the tree right after a session grew it. */
  celebrate?: boolean;
  /** Read by screen readers instead of the picture. */
  label: string;
  className?: string;
}

/** The scene is laid out in a 160 × 120 frame; the tree stands on the plot at (80, 100). */
const FRAME = { width: 160, height: 120 };
const GROUND = { x: 80, y: 100 };
const HORIZON = 52;

/** Leaves (or petals) blown across the scene, coloured like the tree. */
const LEAF_COLOURS: Record<TreeSpecies, string[]> = {
  pine: ["#7fb04a", "#5f9a3a", "#a5cf6b"],
  bamboo: ["#8cc45c", "#6aa846", "#b9dc85"],
  maple: ["#f0742f", "#e2492f", "#f7a640"],
  sakura: ["#f8b4c6", "#f48c9c", "#fde0e8"],
};
const LEAVES = [
  { top: 22, duration: 7.5, delay: 0 },
  { top: 38, duration: 9, delay: 2.4 },
  { top: 55, duration: 6.8, delay: 4.1 },
  { top: 30, duration: 8.4, delay: 5.6 },
  { top: 64, duration: 10, delay: 1.2 },
];
const WIND = [
  { top: 24, width: 22, duration: 4.2, delay: 0.6 },
  { top: 46, width: 30, duration: 5, delay: 2.6 },
  { top: 70, width: 18, duration: 4.6, delay: 4 },
];
const SPARKLES = [
  { left: 30, top: 30, delay: 0 },
  { left: 66, top: 18, delay: 0.5 },
  { left: 72, top: 52, delay: 0.9 },
  { left: 26, top: 58, delay: 0.3 },
];

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/** A garden picture positioned so its anchor (trunk base) sits on `at`. */
function Sprite({
  id,
  at,
  className,
  style,
}: {
  id: string;
  at: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
}) {
  const asset = gardenAsset(id);
  return (
    <Image
      src={assetUrl(id)}
      alt=""
      width={asset.width * 2}
      height={asset.height * 2}
      unoptimized
      draggable={false}
      className={cn("absolute h-auto max-w-none select-none", className)}
      style={{
        left: pct(at.x - asset.anchor.x, FRAME.width),
        top: pct(at.y - asset.anchor.y, FRAME.height),
        width: pct(asset.width, FRAME.width),
        transformOrigin: `${pct(asset.anchor.x, asset.width)} ${pct(asset.anchor.y, asset.height)}`,
        ...style,
      }}
    />
  );
}

/**
 * The Pomodoro tree in a small garden window: sky, distant trees, grass and a tilled plot.
 * The tree sways and rustles in the wind; leaves of its species drift past while the
 * timer runs. All motion is decorative and stops under prefers-reduced-motion.
 */
export function GrowingTreeScene({
  species,
  tree,
  windy,
  celebrate = false,
  label,
  className,
}: GrowingTreeSceneProps) {
  const colours = LEAF_COLOURS[species];

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden border-2 border-border",
        className,
      )}
      style={{ background: "linear-gradient(#8fc6f1 0%, #c9e6fa 42%, #e3f2fb 52%)" }}
    >
      {/* grass from the horizon down */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: pct(HORIZON, FRAME.height),
          backgroundImage: `url(${assetUrl("tile-grass-a")})`,
          backgroundSize: "34% auto",
        }}
      />
      {/* distant treeline sitting on the horizon */}
      <Image
        src={assetUrl("bg-hills")}
        alt=""
        width={1280}
        height={96}
        unoptimized
        className="absolute h-auto w-[200%] max-w-none"
        style={{ left: "-50%", top: pct(HORIZON - 15, FRAME.height) }}
      />

      {windy &&
        WIND.map((streak, index) => (
          <span
            key={`wind-${index}`}
            aria-hidden
            className="anim-wind absolute h-px rounded-full bg-white/80"
            style={
              {
                top: `${streak.top}%`,
                left: 0,
                width: `${streak.width}%`,
                "--wind-duration": `${streak.duration}s`,
                "--wind-delay": `${streak.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

      <Sprite id="plot-soil" at={GROUND} />

      {/* the tree: the outer box sways from the trunk base, the inner one rustles */}
      <div className={cn("absolute inset-0", windy && "anim-tree-sway")} style={treeOrigin}>
        <div className={cn("absolute inset-0", windy && "anim-tree-rustle")} style={treeOrigin}>
          {tree && (
            // Keyed by picture: a new stage mounts fresh and pops in, never blended with the old
            <Sprite
              key={tree.assetId}
              id={tree.assetId}
              at={GROUND}
              className="anim-grow-pop transition-[opacity,transform] duration-1000 ease-linear"
              style={{ opacity: tree.opacity, transform: `scale(${tree.scale})` }}
            />
          )}
        </div>
      </div>

      {windy &&
        LEAVES.map((leaf, index) => (
          <span
            key={`leaf-${index}`}
            aria-hidden
            className="anim-leaf absolute block size-[3%] rounded-[60%_0_60%_0] opacity-0"
            style={
              {
                top: `${leaf.top}%`,
                backgroundColor: colours[index % colours.length],
                "--leaf-duration": `${leaf.duration}s`,
                "--leaf-delay": `${leaf.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

      {celebrate &&
        SPARKLES.map((sparkle, index) => (
          <span
            key={`sparkle-${index}`}
            aria-hidden
            className="anim-sparkle absolute block size-[5%] opacity-0"
            style={
              {
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                "--sparkle-delay": `${sparkle.delay}s`,
                background: "#fce46c",
                clipPath:
                  "polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)",
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}

/** Sway and rustle pivot on the trunk base. */
const treeOrigin: React.CSSProperties = {
  transformOrigin: `${pct(GROUND.x, FRAME.width)} ${pct(GROUND.y, FRAME.height)}`,
};
