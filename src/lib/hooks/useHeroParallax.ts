import { useMotionScene } from "@/lib/hooks/useMotionScene";

import type { RefObject } from "react";

/** How far each layer eases toward its target per frame. */
const LERP = 0.08;
/** Below this many px from its target on both axes, a layer counts as settled and the loop stops. */
const SETTLED_PX = 0.05;

interface Target {
  el: HTMLElement;
  /** Travel at the viewport's edges, in px (data-depth): nearer layers travel further. */
  depth: number;
  x: number;
  y: number;
}

/**
 * Pointer parallax for every [data-depth] element inside `scope`: each shifts against the pointer by up
 * to its data-depth in px horizontally (half that vertically), easing there, so nearer layers slide
 * further and the rig reads as depth. It writes the CSS `translate` property, which composes with
 * the scroll parallax GSAP sets on `transform`. Only on fine pointers with motion allowed, only while
 * `scope` is on screen (off screen, the layers ease home). The loop sleeps once everything settles.
 */
export function useHeroParallax(scope: RefObject<HTMLElement | null>): void {
  useMotionScene(scope, ({ reduced, finePointer }) => {
    const area = scope.current;
    if (reduced || !finePointer || !area) return;
    const targets: Target[] = Array.from(area.querySelectorAll<HTMLElement>("[data-depth]"), (el) => ({
      el,
      depth: Number(el.dataset.depth) || 0,
      x: 0,
      y: 0,
    }));
    if (targets.length === 0) return;

    let aimX = 0;
    let aimY = 0;
    let frame = 0;
    let onScreen = false;

    const tick = () => {
      let moving = false;
      for (const target of targets) {
        const goalX = -aimX * target.depth;
        const goalY = -aimY * target.depth * 0.5;
        target.x += (goalX - target.x) * LERP;
        target.y += (goalY - target.y) * LERP;
        if (Math.abs(goalX - target.x) > SETTLED_PX || Math.abs(goalY - target.y) > SETTLED_PX) moving = true;
        target.el.style.translate = `${target.x.toFixed(2)}px ${target.y.toFixed(2)}px`;
      }
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) return;
      aimX = 0;
      aimY = 0;
      wake();
    });
    observer.observe(area);

    const onPointerMove = ({ clientX, clientY }: PointerEvent) => {
      if (!onScreen) return;
      // -1…1 from the viewport's centre.
      aimX = (clientX / window.innerWidth) * 2 - 1;
      aimY = (clientY / window.innerHeight) * 2 - 1;
      wake();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
      cancelAnimationFrame(frame);
      for (const { el } of targets) el.style.translate = "";
    };
  });
}
