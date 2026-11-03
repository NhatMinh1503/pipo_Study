import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pipo — học ngoại ngữ qua dịch thuật",
    short_name: "pipo",
    description: "Học tiếng Nhật và tiếng Anh qua dịch thuật ngữ cảnh, SRS và AI.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ede6d6",
    theme_color: "#ede6d6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
