import type { CSSProperties } from "react";

/** An inline style that may also set CSS custom properties (`--name`). Inline style is reserved for these and GSAP-driven values. */
export type CssVars = CSSProperties & Record<`--${string}`, string | number>;
