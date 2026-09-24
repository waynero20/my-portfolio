// sRGB hex ↔ OKLCH conversions and WCAG 2 contrast. Pure maths, no DOM: data.ts hex values are the
// source, and theme.ts turns them into oklch() for CSS.

import type { Hex } from "@/lib/types";

/** sRGB channels, 0–255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** OKLCH: l is lightness 0–1, c is chroma, h is hue in degrees [0, 360). */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const HEX_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export function hexToRgb(hex: Hex): Rgb {
  const match = HEX_PATTERN.exec(hex);
  if (!match) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  const [, r, g, b] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

function toByte(channel: number): string {
  const byte = Math.min(255, Math.max(0, Math.round(channel)));
  return byte.toString(16).padStart(2, "0").toUpperCase();
}

export function rgbToHex({ r, g, b }: Rgb): Hex {
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** sRGB transfer function: a 0–255 channel to linear light 0–1. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear light 0–1 back to a 0–255 channel (clamped to the sRGB gamut). */
function fromLinear(linear: number): number {
  const l = Math.min(1, Math.max(0, linear));
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return c * 255;
}

// OKLab matrices from Björn Ottosson, https://bottosson.github.io/posts/oklab/
export function hexToOklch(hex: Hex): Oklch {
  const { r, g, b } = hexToRgb(hex);
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: hue < 0 ? hue + 360 : hue };
}

export function oklchToHex({ l: L, c, h }: Oklch): Hex {
  const radians = (h * Math.PI) / 180;
  const A = c * Math.cos(radians);
  const B = c * Math.sin(radians);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return rgbToHex({
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  });
}

/** WCAG 2 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: Hex): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2 contrast ratio, 1–21, in either order. */
export function contrastRatio(a: Hex, b: Hex): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
