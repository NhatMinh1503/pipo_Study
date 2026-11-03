import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

/** Generic loading state shown while a (main) page checks the session and loads. */
export function PageSkeleton() {
  return (
    <PageContainer aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </PageContainer>
  );
}
