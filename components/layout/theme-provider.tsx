"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Paper by default; the user can switch to the low-light carbon variant (toggle lives in the app nav). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
