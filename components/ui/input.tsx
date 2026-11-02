import * as React from "react";
import { cn } from "cn";

/**
 * A ruled line to fill in, not a box: single-line answers are written on a
 * dashed baseline that firms up into solid carbon blue while focused.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border-x-0 border-t-0 border-b-2 border-dashed border-border/50 bg-transparent px-0.5 pt-1 pb-1.5 font-sans text-[0.9375rem] text-foreground transition-[border-color,border-style,background-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 placeholder:italic focus-visible:border-solid focus-visible:border-primary focus-visible:bg-primary/[0.04] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-dotted disabled:opacity-55 aria-invalid:border-solid aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
