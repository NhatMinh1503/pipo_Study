"use client";

import { Languages, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DISPLAY_LANGUAGES, displayLanguageSchema } from "@/lib/schemas/common";

interface UserMenuProps {
  email: string | undefined;
  onChangeLanguage: (locale: unknown) => Promise<void>;
  onSignOut: () => Promise<void>;
}

/** Account dropdown: current email, UI language switch, sign out. */
export function UserMenu({ email, onChangeLanguage, onSignOut }: UserMenuProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const changeLanguage = (value: string) => {
    const parsed = displayLanguageSchema.safeParse(value);
    if (!parsed.success || parsed.data === locale) return;
    startTransition(async () => {
      await onChangeLanguage(parsed.data);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("userMenu.open")} disabled={isPending}>
          <UserRound aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate font-mono text-[0.6875rem] font-normal tracking-normal text-muted-foreground normal-case">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages aria-hidden />
            {t("userMenu.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={changeLanguage}>
              {DISPLAY_LANGUAGES.map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(`languages.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItemForm action={onSignOut} label={t("auth.signOut")} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownMenuItemForm({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
      >
        <LogOut aria-hidden />
        {label}
      </button>
    </form>
  );
}
