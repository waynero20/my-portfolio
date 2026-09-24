// The three faces. The --ff-* variables feed globals.css's --font-hero|sans|mono tokens.
// - Hero: the Google Sans Flex glyph subset ("ADEINORWY "), preloaded with display: block, so the
//   h1 (the LCP element) never swaps into a second, larger paint.
// - Text: Google Sans Flex (wght, wdth, ROND), self-hosted because next/font/google has no fallback
//   metrics for it. It swaps in over metric-adjusted Arial and is not preloaded.
// - Mono: Fragment Mono 400.

import { Fragment_Mono } from "next/font/google";
import localFont from "next/font/local";

export const heroFont = localFont({
  src: "../assets/fonts/gsf-hero.woff2",
  variable: "--ff-hero",
  weight: "1 1000",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "font-stretch", value: "25% 151%" }],
});

export const textFont = localFont({
  src: "../assets/fonts/gsf-text.woff2",
  variable: "--ff-text",
  weight: "1 1000",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
  declarations: [{ prop: "font-stretch", value: "25% 151%" }],
});

export const monoFont = Fragment_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--ff-mono",
  display: "swap",
  preload: false,
});

// The reel titles' brand faces (Wayne's W20): each reel's title is re-cast, once its flood completes,
// in the display face of the brand's own site (PROJECTS[].titleFont), subset to that title's glyphs
// (npm run assets:titles; 1–2 KB each). None is preloaded or needed for first paint: createCasts()
// loads them all together once the page is idle and only then arms the titles, and until a face has
// loaded its title keeps the night face, so no fallback metrics are needed either.
export const titleBloomFont = localFont({
  src: "../assets/fonts/titles/bloom.woff2",
  variable: "--ff-title-bloom",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titleLegacyFont = localFont({
  src: "../assets/fonts/titles/legacy.woff2",
  variable: "--ff-title-legacy",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titleTampusFont = localFont({
  src: "../assets/fonts/titles/tampus.woff2",
  variable: "--ff-title-tampus",
  weight: "700",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titleTutorloopFont = localFont({
  src: "../assets/fonts/titles/tutorloop.woff2",
  variable: "--ff-title-tutorloop",
  weight: "700",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titleHorizonFont = localFont({
  src: "../assets/fonts/titles/horizon.woff2",
  variable: "--ff-title-horizon",
  weight: "700",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titleMatchmeFont = localFont({
  src: "../assets/fonts/titles/matchme.woff2",
  variable: "--ff-title-matchme",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const titlePickanddinkFont = localFont({
  src: "../assets/fonts/titles/pickanddink.woff2",
  variable: "--ff-title-pickanddink",
  weight: "700",
  style: "italic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/** The --ff-title-{slug} variables, for <html>. */
export const TITLE_FONT_VARIABLES = [
  titleBloomFont,
  titleLegacyFont,
  titleTampusFont,
  titleTutorloopFont,
  titleHorizonFont,
  titleMatchmeFont,
  titlePickanddinkFont,
]
  .map((font) => font.variable)
  .join(" ");
