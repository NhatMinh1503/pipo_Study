import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Letterpress button: square corners, ink rule, hard offset shadow that
 * collapses when pressed so the control physically travels into the page.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border-2 bg-clip-padding font-mono text-[0.8125rem] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-[transform,box-shadow,background-color,border-color,color] duration-100 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:border-dashed disabled:opacity-45 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-primary-press hover:shadow-[1px_1px_0_0_var(--shadow-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        outline:
          "border-border bg-card text-foreground shadow-[3px_3px_0_0_var(--shadow-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-muted hover:shadow-[1px_1px_0_0_var(--shadow-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--shadow-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-muted hover:shadow-[1px_1px_0_0_var(--shadow-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-border bg-destructive text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-destructive-press hover:shadow-[1px_1px_0_0_var(--shadow-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        link: "border-transparent bg-transparent p-0 text-primary underline decoration-dotted decoration-1 underline-offset-4 hover:bg-transparent hover:decoration-solid",
      },
      size: {
        default: "h-9 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 px-2 text-[0.6875rem] tracking-[0.04em] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-sm",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
