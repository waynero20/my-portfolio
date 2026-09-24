// Shared client state. MotionRuntime keeps motionStore in step with the OS and html[data-motion];
// Work writes reelStore.active and the nav follows it.

import type { MotionState, ReelSlug, Store } from "@/lib/types";

import { isBrowser } from "@/lib/dom";
import { PREF_KEYS, writePref } from "@/lib/storage";
import { createStore } from "@/lib/store";

type UserPref = MotionState["userPref"];

const motionState = createStore<MotionState>({ osReduce: false, userPref: null, reduced: false });

/** `reduced` is always derived (osReduce || userPref === "off"); a patch cannot set it directly. */
export const motionStore: Store<MotionState> = {
  get: motionState.get,
  subscribe: motionState.subscribe,
  set(patch) {
    const { osReduce, userPref } = { ...motionState.get(), ...patch };
    motionState.set({ osReduce, userPref, reduced: osReduce || userPref === "off" });
  },
};

export const reelStore = createStore<{ active: ReelSlug | null }>({ active: null });

/** Persists the Motion toggle, sets html[data-motion] (the motion-off variant reads it) and updates motionStore. */
export function setUserPref(pref: UserPref): void {
  writePref(PREF_KEYS.motion, pref);
  if (isBrowser) {
    const { dataset } = document.documentElement;
    if (pref === null) delete dataset.motion;
    else dataset.motion = pref;
  }
  motionStore.set({ userPref: pref });
}

/**
 * The preference in effect, read from html[data-motion]: BOOT_SCRIPT wrote it from ?motion=off (this
 * visit only) or the stored preference, and setUserPref keeps it current. Storage alone would miss
 * ?motion=off.
 */
export function readUserPref(): UserPref {
  if (!isBrowser) return null;
  const { motion } = document.documentElement.dataset;
  return motion === "on" || motion === "off" ? motion : null;
}
