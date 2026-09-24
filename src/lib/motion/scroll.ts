// scrollToTarget: every programmatic scroll on the page goes through here (anchor clicks, the hero's
// reel dots, Rewind). It works with or without Lenis. The offset is always 0: Lenis subtracts the
// target's scroll-margin-top and native scrollIntoView honours it (the cinema reels rely on that).

import { gsap } from "@/lib/motion/gsap";
import { getLenis } from "@/lib/motion/lenis";
import { motionStore } from "@/lib/motion/state";

import type { ScrollOptions } from "@/lib/types";

export type { JumpMode, ScrollOptions } from "@/lib/types";

/** "#id" (or any selector), an element, or a y offset in px. */
type ScrollTarget = string | number | HTMLElement;

function resolveTarget(target: ScrollTarget): number | HTMLElement | null {
  if (typeof target !== "string") return target;
  if (target.startsWith("#")) return document.getElementById(target.slice(1));
  return document.querySelector<HTMLElement>(target);
}

/**
 * An element's scroll destination as one absolute offset: its top minus its scroll-margin-top (the
 * cinema reels use a negative margin so a jump lands flooded) and the root's scroll-padding-top.
 * Resolving here, from the live layout, means Lenis never computes it from a stale animatedScroll
 * (after the browser's own focus scroll or a find-in-page jump it hasn't seen yet).
 */
function destination(element: HTMLElement): number {
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return Math.max(0, element.getBoundingClientRect().top + window.scrollY - margin - padding);
}

/** Jumps with no animation, through Lenis when it runs so its position stays in sync. */
function jump(top: number): void {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: "auto" });
}

/**
 * Focus without a second scroll. A target that can't take focus gets tabindex="-1" first, and is
 * marked data-jump-target so globals.css suppresses the ring on the region (Ruling R14).
 */
function focusTarget(element: HTMLElement): void {
  if (element.tabIndex < 0 && !element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
    element.setAttribute("data-jump-target", "");
  }
  element.focus({ preventScroll: true });
}

/**
 * - "smooth" (default): a Lenis glide when Lenis runs (its lerp glide, or a `duration` tween with
 *   `ease`), else a native jump.
 * - "instant": jumps now.
 * - "cut": an instant jump inside document.startViewTransition, when supported and motion is on.
 * `focus` moves focus to an element target once the scroll starts; `onComplete` runs when it ends.
 * A selector that matches nothing does nothing.
 */
export function scrollToTarget(target: ScrollTarget, opts: ScrollOptions = {}): void {
  const { mode = "smooth", duration, ease = "settle", focus = false, onComplete } = opts;
  const to = resolveTarget(target);
  if (to === null) return;
  const moveFocus = () => {
    if (focus && typeof to !== "number") focusTarget(to);
  };
  const top = typeof to === "number" ? to : destination(to);

  const lenis = getLenis();
  if (mode === "smooth" && lenis) {
    // Easing only with a duration: passing it alone makes Lenis tween for a fixed 1s instead of its lerp glide.
    const tween = duration === undefined ? {} : { duration, easing: gsap.parseEase(ease) };
    lenis.scrollTo(top, { ...tween, force: true, onComplete: () => onComplete?.() });
    moveFocus();
    return;
  }

  const jumpNow = () => {
    jump(typeof to === "number" ? to : destination(to));
    moveFocus();
    onComplete?.();
  };
  if (mode === "cut" && !motionStore.get().reduced && typeof document.startViewTransition === "function") {
    document.startViewTransition(jumpNow);
    return;
  }
  jumpNow();
}
