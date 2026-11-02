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
 * Single-choice list rendered as selectable cards. Built on native radio inputs,
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
      <div className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")}>
        {choices.map((choice) => {
          const checked = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                "group flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
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
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                  {choice.badge}
                </span>
              )}
              <span className="flex-1 space-y-0.5">
                <span className="block font-medium">{choice.label}</span>
                {choice.description && (
                  <span className="block text-sm text-muted-foreground">{choice.description}</span>
                )}
              </span>
              <Check
                className={cn(
                  "size-5 text-primary transition-opacity",
                  checked ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
