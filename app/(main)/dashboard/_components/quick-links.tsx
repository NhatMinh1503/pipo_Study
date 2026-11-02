import { ChartNoAxesColumn, Network, Newspaper, Shapes, Store } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const LINKS = [
  { href: "/analytics", key: "analytics", icon: ChartNoAxesColumn },
  { href: "/quiz", key: "quiz", icon: Shapes },
  { href: "/news", key: "news", icon: Newspaper },
  { href: "/skills", key: "skills", icon: Network },
  { href: "/shop", key: "shop", icon: Store },
] as const;

/** Shortcuts to practice tools that are not in the main navigation. */
export async function QuickLinks() {
  const t = await getTranslations("dashboard.quick");

  return (
    <nav
      aria-label={t("label")}
      className="sheet-flat grid grid-cols-3 divide-x divide-y divide-dashed divide-border/30 sm:grid-cols-5 sm:divide-y-0"
    >
      {LINKS.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1.5 px-3 py-4 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:justify-center"
        >
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
