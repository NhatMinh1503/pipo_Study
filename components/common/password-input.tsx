"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";

/** Password input with a show/hide toggle. Accepts every native input prop. */
export function PasswordInput(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
