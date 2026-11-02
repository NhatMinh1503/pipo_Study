import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

import { HeaderUserMenu } from "./_components/header-user-menu";
import { OnboardedGate } from "./_components/onboarded-gate";
import { PageSkeleton } from "./_components/page-skeleton";

// The app shell (nav, header) renders instantly; user-specific parts stream in.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-1 border-b border-border bg-background/80 px-4 backdrop-blur">
          <span className="mr-auto text-lg font-semibold tracking-tight md:hidden">pipo</span>
          <ThemeToggle />
          <Suspense fallback={<Skeleton className="size-9 rounded-lg" />}>
            <HeaderUserMenu />
          </Suspense>
        </header>
        {/* Bottom padding keeps content clear of the mobile tab bar */}
        <div className="flex-1 pb-20 md:pb-0">
          <Suspense fallback={<PageSkeleton />}>
            <OnboardedGate>{children}</OnboardedGate>
          </Suspense>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
