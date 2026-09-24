import { useSyncExternalStore } from "react";

// One shared minute clock for every subscriber (the contact eyebrow, the call card, the credits).
// It ticks on each minute boundary, pauses while the tab is hidden and catches up when it returns.

let now: Date | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function schedule(): void {
  clearTimeout(timer);
  timer = undefined;
  if (document.hidden) return;
  const current = new Date();
  // Only a new minute is a new snapshot, so subscribers re-render once a minute at most.
  if (!now || Math.floor(now.getTime() / 60_000) !== Math.floor(current.getTime() / 60_000)) {
    now = current;
    emit();
  }
  timer = setTimeout(schedule, 60_000 - (current.getTime() % 60_000) + 50);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", schedule);
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    document.removeEventListener("visibilitychange", schedule);
    clearTimeout(timer);
    timer = undefined;
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => null;

/**
 * The current time, updated on the minute, or null on the server and during hydration (render a
 * fixed-width placeholder until then). Format it with formatCebuTime.
 */
export function useCebuTime(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
