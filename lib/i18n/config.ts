import { DISPLAY_LANGUAGES, type DisplayLanguage } from "@/lib/schemas/common";

export const LOCALES = DISPLAY_LANGUAGES;
export type Locale = DisplayLanguage;

/** International learners land on English until they pick a display language. */
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the UI language; synced from `profiles.display_language`. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}
