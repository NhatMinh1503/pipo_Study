import { PageSkeleton } from "./_components/page-skeleton";

// Gives every (main) page its own Suspense boundary so navigation is instant
export default function MainLoading() {
  return <PageSkeleton />;
}
