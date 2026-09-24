import { useStore } from "@/lib/hooks/useStore";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { motionStore, readUserPref } from "@/lib/motion/state";

import type { RefObject } from "react";
import type { SceneFlags } from "@/lib/types";

import { MQ } from "@/lib/motion/tokens";

export type { SceneFlags } from "@/lib/types";

/** Tailwind's lg: the width from which the hero pins, reels play in cinema mode and Lenis runs. */
const DESKTOP_QUERY = "(min-width: 1024px)";

// gsap.matchMedia only calls the builder while at least one condition matches, so the always-true
// "any" key guarantees a build on every screen; osReduce is watched so an OS change rebuilds too.
const SCENE_CONDITIONS = {
  any: "all",
  desktop: DESKTOP_QUERY,
  heroPin: MQ.heroPin,
  cinema: MQ.cinema,
  phoneCinema: MQ.phoneCinema,
  finePointer: MQ.finePointer,
  osReduce: MQ.osReduce,
} as const;

/**
 * The one way to build a GSAP scene. `build` runs inside useGSAP + gsap.matchMedia, scoped to
 * `scope`, and again (after a full revert) whenever a query flips, motion is toggled or `deps`
 * change. heroPin, cinema and phoneCinema are already false when motion is reduced. Return a cleanup function
 * for anything GSAP doesn't revert on its own.
 */
export function useMotionScene(
  scope: RefObject<HTMLElement | null>,
  build: (flags: SceneFlags) => void | (() => void),
  deps: unknown[] = [],
): void {
  const reduced = useStore(motionStore, (state) => state.reduced);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        SCENE_CONDITIONS,
        (context) => {
          const {
            desktop = false,
            heroPin = false,
            cinema = false,
            phoneCinema = false,
            finePointer = false,
            osReduce = false,
          } = context.conditions ?? {};
          // Read live, not from `reduced`: the first build runs before MotionRuntime syncs the store.
          const isReduced = osReduce || readUserPref() === "off";
          return build({
            reduced: isReduced,
            desktop,
            heroPin: heroPin && !isReduced,
            cinema: cinema && !isReduced,
            phoneCinema: phoneCinema && !isReduced,
            finePointer,
          });
        },
        scope.current ?? undefined,
      );
      return () => mm.revert();
    },
    { scope, dependencies: [reduced, ...deps], revertOnUpdate: true },
  );
}
