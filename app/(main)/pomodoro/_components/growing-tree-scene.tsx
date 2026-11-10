import type { TreeSpecies, TreeStage } from "@/lib/garden/growth";
import type { TreeLayer } from "@/lib/pomodoro/grow";
import { cn } from "@/lib/utils";

interface GrowingTreeSceneProps {
  species: TreeSpecies;
  /** The one picture of the tree; null shows the empty meadow. */
  tree: TreeLayer | null;
  /** Wind and drifting leaves while a session or break runs. */
  windy: boolean;
  /** Sparkles around the tree right after a session grew it. */
  celebrate?: boolean;
  /** The session was left early: the tree wilts. */
  withered?: boolean;
  /** Read by screen readers instead of the picture. */
  label: string;
  className?: string;
}

/** Art for this page lives in public/pomodoro (drawn large, so it stays crisp when scaled). */
export const treeImage = (species: TreeSpecies, stage: TreeStage) =>
  `/pomodoro/tree-${species}-${stage}.webp`;

/** Height of each stage as a share of the scene, so the tree visibly grows up. */
export const STAGE_HEIGHT: Record<TreeStage, number> = { sprout: 32, sapling: 46, mature: 64 };
/** Where the tree stands, from the bottom of the scene (on the meadow, below the hills). */
const GROUND_BOTTOM = 12;

/** Leaves (or petals) blown across the scene, coloured like the tree. */
const LEAF_COLOURS: Record<TreeSpecies, string[]> = {
  pine: ["#7fb04a", "#5f9a3a", "#a5cf6b"],
  bamboo: ["#8cc45c", "#6aa846", "#b9dc85"],
  maple: ["#f0742f", "#e2492f", "#f7a640"],
  sakura: ["#f8b4c6", "#f48c9c", "#fde0e8"],
};
const LEAVES = [
  { top: 30, duration: 11, delay: 0, flutter: 1.7 },
  { top: 46, duration: 13, delay: 3.5, flutter: 2.2 },
  { top: 58, duration: 10, delay: 6.2, flutter: 1.5 },
  { top: 38, duration: 12.5, delay: 8.4, flutter: 2 },
];
const WIND = [
  { top: 22, width: 18, duration: 6.5, delay: 0.8 },
  { top: 52, width: 24, duration: 7.5, delay: 3.6 },
  { top: 70, width: 14, duration: 6, delay: 5.4 },
];
/** Clouds drift slowly across the sky; negative delays spread them out from the start. */
const CLOUDS = [
  { src: "/pomodoro/cloud-big.webp", top: 3, width: 38, duration: 140, delay: -30, flip: false },
  { src: "/pomodoro/cloud-small.webp", top: 20, width: 13, duration: 95, delay: -60, flip: false },
  { src: "/pomodoro/cloud-big.webp", top: 9, width: 26, duration: 170, delay: -120, flip: true },
];
const SPARKLES = [
  { left: 30, top: 30, delay: 0 },
  { left: 66, top: 20, delay: 0.5 },
  { left: 70, top: 52, delay: 0.9 },
  { left: 28, top: 56, delay: 0.3 },
];

/* eslint-disable @next/next/no-img-element -- decorative art, already sized for this scene */

/**
 * The Pomodoro tree in a small meadow: drifting clouds, a breeze, and the tree bending
 * from its base while leaves of its species flutter past. All motion is decorative and
 * stops under prefers-reduced-motion.
 */
export function GrowingTreeScene({
  species,
  tree,
  windy,
  celebrate = false,
  withered = false,
  label,
  className,
}: GrowingTreeSceneProps) {
  const colours = LEAF_COLOURS[species];
  const moving = windy && !withered;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden border-2 border-border bg-[#9fd8f2]",
        className,
      )}
    >
      <img
        src="/pomodoro/scene-bg.webp"
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover select-none"
      />

      {CLOUDS.map((cloud, index) => (
        <img
          key={`cloud-${index}`}
          src={cloud.src}
          alt=""
          draggable={false}
          className="anim-cloud absolute h-auto max-w-none select-none"
          style={
            {
              top: `${cloud.top}%`,
              // Resting place under reduced motion; the drift animation moves `left`
              left: `${[4, 52, 70][index]}%`,
              width: `${cloud.width}%`,
              scale: cloud.flip ? "-1 1" : undefined,
              "--cloud-duration": `${cloud.duration}s`,
              "--cloud-delay": `${cloud.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}

      {windy &&
        WIND.map((streak, index) => (
          <span
            key={`wind-${index}`}
            aria-hidden
            className="anim-wind absolute left-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-0"
            style={
              {
                top: `${streak.top}%`,
                width: `${streak.width}%`,
                "--wind-duration": `${streak.duration}s`,
                "--wind-delay": `${streak.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

      {/* soft shadow on the grass where the tree stands */}
      <span
        aria-hidden
        className="absolute left-1/2 h-[5%] w-[30%] -translate-x-1/2 rounded-[50%] bg-black/10 blur-[2px]"
        style={{ bottom: `${GROUND_BOTTOM - 2}%` }}
      />

      {tree && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 transition-[height] duration-700 ease-out",
            withered && "anim-wither",
          )}
          style={{ bottom: `${GROUND_BOTTOM}%`, height: `${STAGE_HEIGHT[tree.stage]}%` }}
        >
          {/* the outer box bends from the base in the wind, the inner one breathes */}
          <div className={cn("h-full origin-bottom", moving && "anim-tree-sway")}>
            <div className={cn("h-full origin-bottom", moving && "anim-tree-rustle")}>
              {/* Keyed by stage: a new stage mounts fresh and pops in, never blended */}
              <img
                key={tree.stage}
                src={treeImage(species, tree.stage)}
                alt=""
                draggable={false}
                className="anim-grow-pop h-full w-auto max-w-none origin-bottom transition-[opacity,transform,filter] duration-1000 ease-linear select-none"
                style={{
                  opacity: tree.opacity,
                  transform: `scale(${tree.scale})`,
                  filter: withered ? "grayscale(0.7) sepia(0.5) brightness(0.85)" : undefined,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {moving &&
        LEAVES.map((leaf, index) => (
          <span
            key={`leaf-${index}`}
            aria-hidden
            className="anim-leaf absolute block size-[2.6%] opacity-0"
            style={
              {
                top: `${leaf.top}%`,
                "--leaf-duration": `${leaf.duration}s`,
                "--leaf-delay": `${leaf.delay}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="anim-leaf-flutter block size-full rounded-[60%_0_60%_0]"
              style={
                {
                  backgroundColor: colours[index % colours.length],
                  "--flutter-duration": `${leaf.flutter}s`,
                } as React.CSSProperties
              }
            />
          </span>
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
