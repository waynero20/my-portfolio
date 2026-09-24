// Flash safety for Work's house-lights dips (WCAG 2.3.1): a dip never lands within 1s of a flood,
// never at high scroll speed, and never under reduced motion. The reel scenes report flood activity
// here; the house lights ask shouldDip() before dipping and hurry a running dip out of the way when
// a flood starts during it.

/** A dip needs this long (ms) since the last flood frame. */
export const DIP_FLOOD_GAP_MS = 1000;

/** No dip above this scroll speed (px/s): a fast scroll or a jump straight through Work. */
export const DIP_MAX_VELOCITY = 2500;

let lastFloodAt = Number.NEGATIVE_INFINITY;
const listeners = new Set<() => void>();

/** A flood moved this frame (any reel, either direction). */
export function noteFlood(now: number = performance.now()): void {
  lastFloodAt = now;
  for (const listener of [...listeners]) listener();
}

/** Runs `listener` on every flood frame; returns the unsubscribe. */
export function onFlood(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface DipCheck {
  now: number;
  /** ScrollTrigger's getVelocity(), px/s. */
  velocity: number;
  reduced: boolean;
}

export function shouldDip({ now, velocity, reduced }: DipCheck): boolean {
  return !reduced && Math.abs(velocity) <= DIP_MAX_VELOCITY && now - lastFloodAt >= DIP_FLOOD_GAP_MS;
}
