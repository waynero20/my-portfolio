// Night palette (hex) and the per-reel --reel-* tokens. globals.css registers the tokens with night
// initial values; reelThemeCss() emits one [data-reel="slug"] rule per project that overrides them.

import type { Hex, Project, ReelTheme } from "@/lib/types";

import { hexToOklch } from "@/lib/color";

/** The night palette. globals.css declares the same colours on :root in oklch (theme.test.ts checks parity). */
export const NIGHT = {
  blackout: "#060708",
  booth: "#0D0F12",
  seat: "#16191E",
  hairline: "#23272E",
  smoke: "#5E636B",
  ash: "#9A9DA4",
  bone: "#EDE9E3",
  tungsten: "#FFB45C",
  letterbox: "#000000",
  cue: "#FF4A1C",
} as const satisfies Record<string, Hex>;

/** The --reel-{token} custom properties, in emission order. */
export const REEL_TOKENS = ["surface", "ink", "muted", "accent", "cta-bg", "cta-ink", "focus", "spill-l", "spill-r"] as const;

export type ReelToken = (typeof REEL_TOKENS)[number];

export type ReelTokens = Record<ReelToken, Hex>;

const NIGHT_THEME: Readonly<ReelTokens> = {
  surface: NIGHT.blackout,
  ink: NIGHT.bone,
  muted: NIGHT.ash,
  accent: NIGHT.tungsten,
  "cta-bg": NIGHT.tungsten,
  "cta-ink": NIGHT.blackout,
  focus: NIGHT.tungsten,
  "spill-l": NIGHT.booth,
  "spill-r": NIGHT.booth,
};

/** A reel theme as its nine --reel-* token values. */
export function reelTokens(theme: ReelTheme): ReelTokens {
  return {
    surface: theme.surface,
    ink: theme.ink,
    muted: theme.muted,
    accent: theme.accent,
    "cta-bg": theme.ctaBg,
    "cta-ink": theme.ctaInk,
    focus: theme.focus,
    "spill-l": theme.spill[0],
    "spill-r": theme.spill[1],
  };
}

/** The --reel-* tokens at night: the values the @property registrations start from. */
export function nightThemeHex(): Readonly<ReelTokens> {
  return NIGHT_THEME;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** `oklch(L% C H)`, precise enough to round-trip the hex. Hue is 0 when there is no chroma. */
function toOklchCss(hex: Hex): string {
  const { l, c, h } = hexToOklch(hex);
  const chroma = round(c, 4);
  return `oklch(${round(l * 100, 2)}% ${chroma} ${chroma === 0 ? 0 : round(h, 2)})`;
}

/** One `[data-reel="slug"]{--reel-*:oklch(…);…}` rule per project, for a <style> element. */
export function reelThemeCss(projects: readonly Pick<Project, "slug" | "theme">[]): string {
  return projects
    .map(({ slug, theme }) => {
      const tokens = reelTokens(theme);
      const declarations = REEL_TOKENS.map((token) => `--reel-${token}:${toOklchCss(tokens[token])}`).join(";");
      return `[data-reel="${slug}"]{${declarations}}`;
    })
    .join("\n");
}
