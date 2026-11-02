import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string | null;
  url: string | null;
  className?: string;
}

/** Square avatar with a neutral fallback icon; used in the feed and leaderboards. */
export function UserAvatar({ name, url, className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-muted",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage URL, no optimizer needed
        <img src={url} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        <UserRound className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}
