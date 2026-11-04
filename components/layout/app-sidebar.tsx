"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { isNavItemActive, NAV_ITEMS } from "./nav-items";

/**
 * Left navigation on md+ screens, set as the index of a ledger: a nameplate,
 * a dashed rule, then numbered entries. The open entry is the sheet in use.
 */
export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r-2 border-border bg-sidebar px-4 py-6 md:flex">
      <Link
        href="/dashboard"
        className="truncate px-1 font-heading text-xl leading-none font-bold tracking-[0.2em] uppercase"
      >
        pipo
      </Link>
      <div className="mt-4 border-t border-dashed border-border/35" />
      <nav aria-label={t("label")} className="mt-4 flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }, index) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 border-2 px-2.5 py-2 text-sm transition-colors",
                active
                  ? "border-border bg-tint-blush font-semibold text-foreground shadow-[2px_2px_0_0_var(--shadow-ink)]"
                  : "border-transparent text-muted-foreground hover:border-border/20 hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <span className="mono-value w-4 shrink-0 text-[0.625rem] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
