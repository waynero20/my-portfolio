import type { Hex } from "./content";

export type AtmosphereCueName = "hero" | "about" | "work" | "services" | "stack" | "contact" | "footer";

export interface AtmosphereCue {
  light: [number, number];
  intensity: number;
  radius: number;
  fog: number;
  tint: Hex;
}

export type AtmosphereStatus = "idle" | "static" | "webgl" | "lost";

/**
 * What the renderer implements (M5) and hands to atmosphere._attach(). The atmosphere singleton
 * forwards each call below, with the same arguments; calls made before attach are replayed on it.
 */
export interface AtmosphereSink {
  setCue(cue: AtmosphereCueName | Partial<AtmosphereCue>, o?: { duration?: number }): void;
  setDolly(p: number): void;
  trackScreen(el: HTMLElement | null): void;
  setCovered(covered: boolean): void;
  setAmbient(l: Hex | null, r?: Hex): void;
  ripple(clientX: number, clientY: number, strength?: number): void;
}
