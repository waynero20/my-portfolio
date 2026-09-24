// The pure side of typecasting: a preset's axis variables, its case, tracking and figures, and the
// fit maths. No GSAP here, so server components (ReelTitle) can import it without pulling the
// motion runtime into their module graph; typecast.ts builds the morph on top.

import type { TypecastPreset } from "@/lib/types";

/** The font size (px) the fit probe measures a title at. */
export const FIT_PROBE_PX = 100;

/**
 * --fit for a title that is `width` px wide at `measuredAtPx`: the font size per px of box width
 * that makes it exactly as wide as its box (font-size = --fit × 100cqi). null for a width no
 * rendered title can have, such as 0 while it is hidden.
 */
export function fitFromWidth(width: number, measuredAtPx: number = FIT_PROBE_PX): number | null {
  if (!Number.isFinite(width) || width <= 0) return null;
  return measuredAtPx / width;
}

export type AxisVars = Record<"--wght" | "--wdth" | "--rond", number>;

/** The axis variables the `axes` utility composes into font-variation-settings. */
export function presetVars({ wght, wdth, rond }: TypecastPreset): AxisVars {
  return { "--wght": wght, "--wdth": wdth, "--rond": rond };
}
