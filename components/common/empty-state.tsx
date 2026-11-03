import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Placeholder shown when a list has nothing to display yet. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 border-2 border-dashed border-border/30 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center border border-border/35 text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <p className="font-heading text-base font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
