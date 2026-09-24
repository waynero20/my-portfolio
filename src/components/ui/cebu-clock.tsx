"use client";

import { useCebuTime } from "@/lib/hooks/useCebuTime";

import { CONTACT_COPY } from "@/lib/data";
import { formatCebuTime } from "@/lib/cebu-time";
import { cn } from "@/lib/utils";

interface Props {
  /** Adds the " PHT" zone after the time (default true). */
  zone?: boolean;
  className?: string;
}

/**
 * The live time in Cebu ("11:42 PM PHT"), ticking on the minute. It renders in mono inside a fixed
 * 8ch slot, right-aligned, so neither the placeholder before mount nor "9:05" vs "11:42" ever
 * shifts the line.
 */
export function CebuClock({ zone = true, className }: Props) {
  const now = useCebuTime();

  return (
    <span className={cn("font-mono whitespace-nowrap tabular-nums", className)}>
      <span className="inline-block min-w-[8ch] text-right">
        {now ? (
          <time dateTime={now.toISOString()}>{formatCebuTime(now)}</time>
        ) : (
          <span aria-hidden>--:-- --</span>
        )}
      </span>
      {zone && ` ${CONTACT_COPY.zoneLabel}`}
    </span>
  );
}
