import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Inter covers Vietnamese diacritics; Noto Sans JP renders kana/kanji
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "vietnamese"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-jp",
  // Japanese glyphs are split into many unicode-range files; let the browser fetch on demand
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "pipo", template: "%s · pipo" },
  description: "Học ngoại ngữ qua dịch thuật ngữ cảnh, SRS và AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ThemeProvider>
          {/* The UI language comes from a cookie, so everything below renders per request */}
          <Suspense fallback={null}>
            <NextIntlClientProvider>
              {children}
              <Toaster position="top-center" />
            </NextIntlClientProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
