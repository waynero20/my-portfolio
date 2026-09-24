import { useSyncExternalStore } from "react";

import type { Store } from "@/lib/types";

/**
 * Subscribes a component to a slice of a store. `select` must return a primitive or a reference
 * that only changes with the state (not a new object per call), or React re-renders forever.
 * Stores only change after mount, so the server and the hydrating client read the same initial state.
 */
export function useStore<T, S>(store: Store<T>, select: (state: T) => S): S {
  const getSnapshot = () => select(store.get());
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
