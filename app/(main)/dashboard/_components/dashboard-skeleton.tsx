import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-3 divide-x divide-dashed divide-border/30 border-2 border-border bg-card">
        {[0, 1, 2].map((index) => (
          <div key={index} className="px-4 py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Skeleton className="h-52 border-2 border-border" />
        <Skeleton className="h-52 border-2 border-border" />
      </div>
    </div>
  );
}
