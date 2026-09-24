// The time in Cebu (Asia/Manila: UTC+8 all year, no DST). Pure; the label is assembled from
// formatToParts, so it never depends on ICU's own "en-PH" punctuation.

import type { CebuClock } from "@/lib/types";

import { SITE } from "@/lib/data";

const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

let formatter: Intl.DateTimeFormat | null | undefined;

/** One cached formatter; null where the runtime has no Asia/Manila zone data. */
function getFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) return formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-PH", {
      timeZone: SITE.timeZone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    formatter = null;
  }
  return formatter;
}

function hourAndMinute(date: Date): { hour: number; minute: number } {
  const format = getFormatter();
  if (format) {
    const parts = format.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    // Some engines print midnight as "24" even under h23.
    if (Number.isFinite(hour) && Number.isFinite(minute)) return { hour: hour % 24, minute };
  }
  const shifted = new Date(date.getTime() + UTC_OFFSET_MS);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

/** The wall clock in Cebu: hour, minute and a "11:42 PM" label. */
export function getCebuClock(date: Date): CebuClock {
  const { hour, minute } = hourAndMinute(date);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const label = `${hour12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  return { hour, minute, label };
}

/** "11:42 PM" in Cebu. The zone ("PHT") is added by the caller. */
export function formatCebuTime(date: Date): string {
  return getCebuClock(date).label;
}
