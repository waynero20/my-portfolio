import { Atmosphere } from "@/components/layout/atmosphere";
import { MotionRuntime } from "@/components/layout/motion-runtime";

import { BOOT_SCRIPT } from "@/lib/edition";
import { buildJsonLd, jsonLdScript } from "@/lib/seo";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { EDITIONS, SITE } from "@/lib/data";
import { TITLE_FONT_VARIABLES, heroFont, monoFont, textFont } from "@/lib/fonts";
import { NIGHT } from "@/lib/theme";
import { cn } from "@/lib/utils";

import "./globals.css";

const TITLE = "Wayne Rondina — Full-stack developer, Cebu";
const DESCRIPTION = EDITIONS.client.lead;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-64.png", type: "image/png", sizes: "64x64" },
      { url: "/favicon-180.png", type: "image/png", sizes: "180x180" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: SITE.url,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: NIGHT.blackout,
};

interface Props {
  children: ReactNode;
}

/**
 * The document shell. BOOT_SCRIPT sets html[data-js|data-edition|data-motion] before first paint,
 * hence suppressHydrationWarning. The page background lives on body only, so the fixed Atmosphere
 * layer (z-index -1) paints above it. Match-cut and house-lights portals render into #fx-root.
 */
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(heroFont.variable, textFont.variable, monoFont.variable, TITLE_FONT_VARIABLES)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(buildJsonLd()) }} />
      </head>
      <body>
        <Atmosphere />
        {children}
        <div id="fx-root" />
        <MotionRuntime />
      </body>
    </html>
  );
}
