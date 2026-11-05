import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
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

// Typewriter voice for headings, micro-labels and numerals.
// Static weights, and the Vietnamese subset keeps diacritics intact in display type.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "pipo", template: "%s · pipo" },
  description: "Học ngoại ngữ qua dịch thuật ngữ cảnh, SRS và AI.",
  appleWebApp: { capable: true, title: "pipo", statusBarStyle: "default" },
  // Declaring icons here replaces the app/icon.png convention, so the favicon is listed too
  icons: { icon: "/icon.png", apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${notoSansJp.variable} ${plexMono.variable} h-full antialiased`}
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
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
