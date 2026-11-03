import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * A rubber-stamped tag. Square, ruled, tracked uppercase — never a pill,
 * so it reads as a mark made on the document rather than a UI chip.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-none border px-1.5 font-mono text-[0.625rem] font-semibold tracking-[0.1em] whitespace-nowrap uppercase transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-border bg-primary text-primary-foreground",
        secondary: "border-border bg-transparent text-foreground",
        destructive: "border-destructive/50 bg-destructive/10 text-destructive",
        outline: "border-dashed border-border/55 text-muted-foreground",
        ghost: "border-transparent text-muted-foreground",
        link: "border-transparent text-primary underline decoration-dotted underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
