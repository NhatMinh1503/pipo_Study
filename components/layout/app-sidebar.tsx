"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { isNavItemActive, NAV_ITEMS } from "./nav-items";

/** Left navigation on md+ screens. */
export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-3 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 px-3 text-xl font-semibold tracking-tight">
        pipo
      </Link>
      <nav aria-label={t("label")} className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
