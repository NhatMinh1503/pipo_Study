"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Dark by default; the user can switch to light (toggle lives in the app nav). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
