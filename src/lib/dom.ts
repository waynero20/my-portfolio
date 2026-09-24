// Small browser helpers that are safe to import on the server.

import { MQ } from "@/lib/motion/tokens";

const IDLE_FALLBACK_MS = 1200;

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

/** The OS reduced-motion setting only. Use motionStore.reduced for the full answer (OS or Motion toggle). */
export function prefersReducedMotion(): boolean {
  return isBrowser && window.matchMedia(MQ.osReduce).matches;
}

/** Runs the callback when the main thread is idle (a 1200ms timeout where requestIdleCallback is missing). Returns a cancel function. */
export function onIdle(callback: () => void): () => void {
  if (typeof globalThis.requestIdleCallback === "function") {
    const handle = requestIdleCallback(() => callback());
    return () => cancelIdleCallback(handle);
  }
  const timer = setTimeout(callback, IDLE_FALLBACK_MS);
  return () => clearTimeout(timer);
}
