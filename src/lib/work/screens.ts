// What the reel scenes tell the screen islands, outside React: per reel (by index in PROJECTS), how
// much of its screen is the one the viewer sees (`share`), how far its room has flooded (`flood`) and
// whether its spill glow can show at all (`spill`). useReelScenes writes it; useReelVideo (which
// screen may play) and useAmbilight (sampling only while the spill shows and the room is not flooded)
// read it. A reel with no scene (reduced motion, before hydration) rests at share 1, flood 1 and
// spill true: fully shown and flooded.

export interface ScreenSignal {
  /**
   * 0 to 1. Cinema: 0 while the stage rises unlit or once the next reel has covered it, falling as
   * the next reel's screen lights up over it. Flow and reduced: 1 (IntersectionObserver decides).
   */
  share: number;
  /** The room's flood, 0 (only the lit screen) to 1 (the whole stage is the brand). */
  flood: number;
  /**
   * Whether the spill can show. Cinema hides it on reels 2… (they light up over another brand's
   * room, work.css), except the last reel while it un-floods back to the night.
   */
  spill: boolean;
}

const REST: ScreenSignal = { share: 1, flood: 1, spill: true };

const signals = new Map<number, ScreenSignal>();
const listeners = new Map<number, Set<() => void>>();

function notify(index: number): void {
  for (const listener of [...(listeners.get(index) ?? [])]) listener();
}

export const reelScreens = {
  get(index: number): ScreenSignal {
    return signals.get(index) ?? REST;
  },
  /** Stores and announces a change; an unchanged signal notifies no one. */
  set(index: number, next: ScreenSignal): void {
    const previous = signals.get(index) ?? REST;
    if (previous.share === next.share && previous.flood === next.flood && previous.spill === next.spill) return;
    signals.set(index, next);
    notify(index);
  },
  /** Back to rest (the scene was torn down). */
  reset(index: number): void {
    if (!signals.delete(index)) return;
    notify(index);
  },
  subscribe(index: number, listener: () => void): () => void {
    let set = listeners.get(index);
    if (!set) {
      set = new Set();
      listeners.set(index, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  },
};
