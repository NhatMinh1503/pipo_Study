"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Choice<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  /** Short badge on the left, e.g. a flag or level code. */
  badge?: string;
}

interface ChoiceGroupProps<TValue extends string> {
  name: string;
  /** Accessible name of the whole group. */
  legend: string;
  choices: readonly Choice<TValue>[];
  value: TValue | undefined;
  onChange: (value: TValue) => void;
  columns?: 1 | 2;
}

/**
 * Single-choice list rendered as selectable rows. Built on native radio inputs,
 * so arrow keys, focus and screen readers work without extra code.
 */
export function ChoiceGroup<TValue extends string>({
  name,
  legend,
  choices,
  value,
  onChange,
  columns = 1,
}: ChoiceGroupProps<TValue>) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={cn("grid gap-2.5", columns === 2 && "sm:grid-cols-2")}>
        {choices.map((choice) => {
          const checked = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                "group flex cursor-pointer items-center gap-3 border-2 px-3.5 py-3 transition-colors",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                checked
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border/30 hover:border-border/70 hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              {choice.badge && (
                <span className="flex h-8 min-w-8 shrink-0 items-center justify-center border border-border/40 bg-muted/60 px-1.5 font-mono text-xs font-semibold tracking-[0.06em]">
                  {choice.badge}
                </span>
              )}
              <span className="flex-1 space-y-0.5">
                <span className="block text-sm font-semibold">{choice.label}</span>
                {choice.description && (
                  <span className="block text-[0.8125rem] leading-snug text-muted-foreground">
                    {choice.description}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/35 text-transparent",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
