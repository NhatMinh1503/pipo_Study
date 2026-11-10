"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/**
 * Keeps <html lang> on the UI language. The root layout cannot read the locale cookie
 * without blocking the static shell, so the attribute is set after hydration.
 */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
