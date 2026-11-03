import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–1 */
  value: number;
  className?: string;
  children?: React.ReactNode;
}

const SIZE = 280;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular progress indicator with content in the middle. */
export function ProgressRing({ value, className, children }: ProgressRingProps) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-72", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-border/20"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, value)))}
          className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}
