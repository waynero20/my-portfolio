// A tiny external store for state shared across client islands, read in React with useStore().

import type { Store } from "@/lib/types";

export type { Store } from "@/lib/types";

/**
 * `set` shallow-merges the patch into a new state object and notifies subscribers. A patch that
 * changes nothing (compared with Object.is) keeps the same snapshot and notifies no one, so
 * useSyncExternalStore never sees a spurious change.
 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(patch) {
      const changed = (Object.keys(patch) as (keyof T)[]).some((key) => !Object.is(state[key], patch[key]));
      if (!changed) return;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
