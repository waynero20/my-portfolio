import { useMotionScene } from "@/lib/hooks/useMotionScene";
import { ScrollTrigger } from "@/lib/motion/gsap";
import { motionStore } from "@/lib/motion/state";

import type { RefObject } from "react";

import { DURATION, EASE } from "@/lib/motion/tokens";
import { onFlood, shouldDip } from "@/lib/work/flash-guard";

/** How far the booth wash comes up at the dip's lowest point: a dimming, never a blackout. */
const DIP_OPACITY = 0.4;

/** The dip's lowest point, as a share of its 420ms: the lights go down fast and come back slowly. */
const DIP_LOW_AT = 0.3;

const SETTLE_EASING = `cubic-bezier(${EASE.settle.join(", ")})`;

/** A load or rebuild that lands inside Work fires the boundary callbacks; no dip for those. */
const SETTLE_MS = 600;

/** A flood that starts during a dip hurries it out at this playback rate. */
const HURRY_RATE = 4;

/**
 * The house lights: one 420ms dip of the booth wash (`lamp`, a fixed overlay; down in 126ms with a
 * settle ease, back up over the rest) each time the scroll
 * crosses into or out of Work (`scope`'s top and bottom passing the viewport's middle, either way).
 * Gated by shouldDip: never above 2500px/s, never within 1s after a flood, and a flood that starts
 * during a dip speeds it out. Nothing is built under reduced motion.
 */
export function useHouseLights(scope: RefObject<HTMLElement | null>, lamp: RefObject<HTMLElement | null>): void {
  useMotionScene(scope, ({ reduced }) => {
    const root = scope.current;
    if (!root || reduced) return;
    const readyAt = performance.now() + SETTLE_MS;
    let dip: Animation | null = null;

    const fire = (self: ScrollTrigger) => {
      const now = performance.now();
      const el = lamp.current;
      if (!el || now < readyAt) return;
      if (!shouldDip({ now, velocity: self.getVelocity(), reduced: motionStore.get().reduced })) return;
      dip?.cancel();
      dip = el.animate(
        [
          { opacity: 0, easing: SETTLE_EASING },
          { opacity: DIP_OPACITY, offset: DIP_LOW_AT, easing: "ease-in-out" },
          { opacity: 0 },
        ],
        { duration: DURATION.ui * 1000 },
      );
    };

    ScrollTrigger.create({
      trigger: root,
      start: "top center",
      end: "bottom center",
      onEnter: fire,
      onLeave: fire,
      onEnterBack: fire,
      onLeaveBack: fire,
    });

    const stopListening = onFlood(() => {
      if (dip?.playState === "running" && dip.playbackRate < HURRY_RATE) dip.updatePlaybackRate(HURRY_RATE);
    });

    return () => {
      stopListening();
      dip?.cancel();
    };
  });
}
