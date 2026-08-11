import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PelviFlow — Routine guidée",
    short_name: "PelviFlow",
    description: "Routine guidée de Kegels et Reverse Kegels.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080d18",
    theme_color: "#080d18",
    lang: "fr",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
