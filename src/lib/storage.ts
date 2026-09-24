// localStorage preferences. Every access is wrapped in try/catch: private mode, blocked storage
// and a full quota all throw, and a preference is never worth an error.

export const PREF_KEYS = {
  /** "on" | "off"; absent means follow the OS. BOOT_SCRIPT reads it before first paint. */
  motion: "motion-pref",
} as const;

export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

export function readPref(key: PrefKey): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Stores the value, or removes the key when given null. */
export function writePref(key: PrefKey, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage is unavailable; the preference simply isn't remembered.
  }
}
