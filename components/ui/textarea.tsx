import * as React from "react";
import { cn } from "cn";

/**
 * A writing area: a ruled box with paper fill, sized for a paragraph of
 * translation rather than a single answer.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full border-2 border-border bg-card px-3 py-2.5 font-sans text-[0.9375rem] leading-relaxed text-foreground transition-[border-color,background-color] outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
