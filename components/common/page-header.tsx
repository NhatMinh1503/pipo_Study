interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons or links aligned to the right on wide screens. */
  actions?: React.ReactNode;
}

/** Title block at the top of every main-app page, closed by a dashed rule. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-dashed border-border/30 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
