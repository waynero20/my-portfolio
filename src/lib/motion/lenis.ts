// Lenis smooth scroll, internal to src/lib/motion (ESLint bans importing lenis anywhere else).
// Everything else scrolls through scrollToTarget. MotionRuntime starts it only on large fine-pointer
// screens with motion allowed. It runs on gsap.ticker, and every Lenis scroll updates ScrollTrigger.

import Lenis from "lenis";
// Lenis's stylesheet ships with its only user. layout.tsx must not import it again.
import "lenis/dist/lenis.css";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { LENIS_LERP } from "@/lib/motion/tokens";

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

export function startLenis(): void {
  if (lenis) return;
  const instance = new Lenis({ lerp: LENIS_LERP, autoRaf: false });
  const onTick = (time: number) => instance.raf(time * 1000);
  instance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(onTick);
  gsap.ticker.lagSmoothing(0);
  lenis = instance;
  tick = onTick;
}

export function stopLenis(): void {
  if (!lenis) return;
  lenis.destroy();
  if (tick) gsap.ticker.remove(tick);
  gsap.ticker.lagSmoothing(500, 33);
  lenis = null;
  tick = null;
}

/** The running instance, or null when native scroll is in charge. */
export function getLenis(): Lenis | null {
  return lenis;
}
