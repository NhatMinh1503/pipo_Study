"use client";

import * as React from "react";
import { cn } from "cn";
import { Label as LabelPrimitive } from "radix-ui";

/** Typewriter caption above a field or a control. */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 font-mono text-[0.6875rem] leading-tight font-semibold tracking-[0.12em] text-muted-foreground uppercase select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
