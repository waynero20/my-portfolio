// Contact types. Pure: no DOM, React or value imports.

/** The wall-clock time in Cebu (Asia/Manila, UTC+8, no DST). */
export interface CebuClock {
  /** 0–23. */
  hour: number;
  /** 0–59. */
  minute: number;
  /** "11:42 PM" (12-hour, no zero padding on the hour, no zone). */
  label: string;
}
