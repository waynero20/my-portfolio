// Fit maths for the hero name, from the hero face's metrics (generated/hero-font-metrics.json, in
// font units at wght 640). Pure: the hero passes these numbers to hero.css as custom properties.

import metrics from "@/lib/generated/hero-font-metrics.json";

export type HeroWord = keyof typeof metrics.advances;
export type HeroWdth = keyof (typeof metrics.advances)[HeroWord];

/** Mirrors --text-display--line-height in globals.css (hero-fit.test.ts keeps them equal). */
export const HERO_LINE_HEIGHT = 0.82;

/** Mirrors --text-display--letter-spacing in globals.css, in em. */
export const HERO_TRACKING_EM = -0.04;

/** Cap height in em. */
export const HERO_CAP_EM = metrics.capHeight / metrics.unitsPerEm;

const DISPLAY = { minPx: 64, maxPx: 288, vw: 17, svh: 24 } as const;

/** The --text-display font size, clamp(64px, min(17vw, 24svh), 288px), for a viewport in px. */
export function heroDisplayPx(viewportWidth: number, viewportHeight: number): number {
  const fluid = Math.min((viewportWidth * DISPLAY.vw) / 100, (viewportHeight * DISPLAY.svh) / 100);
  return Math.min(Math.max(fluid, DISPLAY.minPx), DISPLAY.maxPx);
}

/**
 * A word's rendered width in em: its kerned advance plus the tracking Chrome adds after every
 * letter, the last one included.
 */
export function heroWordEm(word: HeroWord, wdth: HeroWdth): number {
  return metrics.advances[word][wdth] / metrics.unitsPerEm + word.length * HERO_TRACKING_EM;
}

/**
 * Where the caps sit inside a line box, in em. The line box is centred on the font's ascent +
 * descent, so `over` is the gap above the cap height and `under` the gap below the baseline. They
 * are what `text-box: trim-both cap alphabetic` trims, so they stand in for it where it is missing.
 */
export function heroCapBand(lineHeight: number = HERO_LINE_HEIGHT): { over: number; under: number } {
  const ascent = metrics.ascender / metrics.unitsPerEm;
  const descent = -metrics.descender / metrics.unitsPerEm;
  const halfLeading = (lineHeight - (ascent + descent)) / 2;
  return { over: ascent + halfLeading - HERO_CAP_EM, under: descent + halfLeading };
}
