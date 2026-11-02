"use client";

import * as React from "react";
import { cn } from "cn";
import { Separator as SeparatorPrimitive } from "radix-ui";

/** A dashed rule, as between two blocks on a printed form. */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 border-border/40 data-horizontal:h-0 data-horizontal:w-full data-horizontal:border-t data-horizontal:border-dashed data-vertical:w-0 data-vertical:self-stretch data-vertical:border-l data-vertical:border-dashed",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
