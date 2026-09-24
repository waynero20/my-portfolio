import { useStore } from "@/lib/hooks/useStore";
import { motionStore, setUserPref } from "@/lib/motion/state";

import type { MotionState } from "@/lib/types";

/** The motion state (reduced = OS reduce || Motion toggle off) and the toggle's setter. */
export function useMotionPreference(): MotionState & { setUserPref: typeof setUserPref } {
  const state = useStore(motionStore, (current) => current);
  return { ...state, setUserPref };
}
