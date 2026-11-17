import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pipo — học ngoại ngữ qua dịch thuật",
    short_name: "pipo",
    description: "Học tiếng Nhật và tiếng Anh qua dịch thuật ngữ cảnh, SRS và AI.",
    id: "/dashboard",
    start_url: "/dashboard",
    lang: "en",
    categories: ["education", "productivity"],
    scope: "/",
    display: "standalone",
    background_color: "#ede6d6",
    theme_color: "#ede6d6",
    // Long-press the app icon: jump straight into the mobile-first tools
    shortcuts: [
      {
        name: "Pomodoro",
        url: "/pomodoro",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Review", url: "/review", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      {
        name: "Lessons",
        url: "/lessons",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
