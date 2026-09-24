"use client";

import { useEffect } from "react";

import { requestRefresh } from "@/lib/motion/gsap";
import { startLenis, stopLenis } from "@/lib/motion/lenis";
import { scrollToTarget } from "@/lib/motion/scroll";
import { motionStore, readUserPref } from "@/lib/motion/state";

import type { JumpMode } from "@/lib/types";

import { MQ } from "@/lib/motion/tokens";

const JUMP_MODES: readonly JumpMode[] = ["smooth", "instant", "cut"];

/** Anything taller than this many viewports is over the page-height budget (dev warning only). */
const MAX_PAGE_VIEWPORTS = 12;

function toJumpMode(value: string | undefined): JumpMode {
  return JUMP_MODES.find((mode) => mode === value) ?? "smooth";
}

/** Same-page links (`a[href^="#"]`) scroll through scrollToTarget; `data-jump` picks the mode. */
function onAnchorClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  const hash = link?.getAttribute("href");
  // A bare "#" or a missing target keeps the browser's default.
  if (!link || !hash || !document.getElementById(hash.slice(1))) return;
  event.preventDefault();
  scrollToTarget(hash, { mode: toJumpMode(link.dataset.jump), focus: true });
  history.replaceState(null, "", hash);
}

function warnIfPageTooTall(): void {
  const viewports = document.documentElement.scrollHeight / window.innerHeight;
  if (viewports > MAX_PAGE_VIEWPORTS) {
    console.warn(`Page height is ${viewports.toFixed(1)} viewports; the budget is ${MAX_PAGE_VIEWPORTS}.`);
  }
}

/**
 * The page's motion runtime. It renders nothing and:
 * - keeps motionStore in step with the OS setting and html[data-motion];
 * - runs Lenis only on smooth-scroll screens with motion allowed, and refreshes ScrollTrigger when
 *   the motion mode flips (the layout variants change with it);
 * - routes same-page anchor clicks through scrollToTarget;
 * - refreshes ScrollTrigger once the fonts are ready;
 * - in development, warns when the page is taller than 12 viewports.
 */
export function MotionRuntime(): null {
  useEffect(() => {
    const osReduce = window.matchMedia(MQ.osReduce);
    const smoothScroll = window.matchMedia(MQ.smoothScroll);
    const syncLenis = () => {
      if (smoothScroll.matches && !motionStore.get().reduced) startLenis();
      else stopLenis();
    };
    const syncOsReduce = () => motionStore.set({ osReduce: osReduce.matches });

    motionStore.set({ osReduce: osReduce.matches, userPref: readUserPref() });
    syncLenis();

    let wasReduced = motionStore.get().reduced;
    const unsubscribe = motionStore.subscribe(() => {
      const { reduced } = motionStore.get();
      if (reduced === wasReduced) return;
      wasReduced = reduced;
      syncLenis();
      requestRefresh();
    });
    osReduce.addEventListener("change", syncOsReduce);
    smoothScroll.addEventListener("change", syncLenis);

    return () => {
      unsubscribe();
      osReduce.removeEventListener("change", syncOsReduce);
      smoothScroll.removeEventListener("change", syncLenis);
      stopLenis();
    };
  }, []);

  useEffect(() => {
    document.addEventListener("click", onAnchorClick);
    return () => document.removeEventListener("click", onAnchorClick);
  }, []);

  useEffect(() => {
    void document.fonts.ready.then(requestRefresh);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (document.readyState === "complete") {
      warnIfPageTooTall();
      return;
    }
    window.addEventListener("load", warnIfPageTooTall, { once: true });
    return () => window.removeEventListener("load", warnIfPageTooTall);
  }, []);

  return null;
}
