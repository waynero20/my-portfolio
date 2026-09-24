// Pure video decisions for the reel screens: which rendition to load, which screens may hold a src,
// and whether a screen should be playing. useReelVideo applies them to the <video> elements.

import type { ReelMedia, VideoCodec } from "@/lib/content";

/** At most this many videos have a src attached at once. */
export const MAX_ARMED = 2;

/** The rendition width for phones (MQ.mobileVideo) and for everything else. */
const MOBILE_WIDTH = 720;
const DESKTOP_WIDTH = 1280;

export interface SourceNeeds {
  /** MQ.mobileVideo matches. */
  mobile: boolean;
  /** canPlayType() on the AV1 source's type answers "probably". */
  canPlayAv1: boolean;
}

/**
 * The one src to load: AV1 when the browser can play it, else H.264, at 720 on phones and 1280
 * elsewhere (the closest width when that one is missing). null when no source can play.
 */
export function pickSource(media: Pick<ReelMedia, "sources">, { mobile, canPlayAv1 }: SourceNeeds): string | null {
  const width = mobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const codecs: readonly VideoCodec[] = canPlayAv1 ? ["av1", "h264"] : ["h264"];
  for (const codec of codecs) {
    const [closest] = media.sources
      .filter((source) => source.codec === codec)
      .sort((a, b) => Math.abs(a.width - width) - Math.abs(b.width - width));
    if (closest) return closest.src;
  }
  return null;
}

/** A screen in the pool: its reel index and how much of it is on screen (0 to 1). */
export interface PoolEntry {
  index: number;
  ratio: number;
}

/**
 * The reel indices that may hold a src. While two or more screens are seen (a cross-dissolve, or two
 * articles sharing the viewport in flow), the two most seen, so neither drops to its poster mid-view.
 * While one is seen, it plus its neighbour in the scroll direction, which loads ahead. Ties go to the
 * screen further along the scroll direction. Nothing while none is seen.
 */
export function pickArmed(entries: readonly PoolEntry[], direction: 1 | -1): number[] {
  const seen = entries
    .filter((entry) => entry.ratio > 0)
    .sort((a, b) => b.ratio - a.ratio || (b.index - a.index) * direction);
  const [current, runnerUp] = seen;
  if (!current) return [];
  if (runnerUp) return [current.index, runnerUp.index];
  const next = current.index + direction;
  return entries.some((entry) => entry.index === next) ? [current.index, next] : [current.index];
}

/** "auto" plays when motion is allowed; "paused" and "playing" are the viewer's own choice (sticky). */
export type PlayIntent = "auto" | "paused" | "playing";

/** Whether the pause button shows the video as paused. */
export function isPaused(intent: PlayIntent, reduced: boolean): boolean {
  return intent === "paused" || (intent === "auto" && reduced);
}

/** The intent after a press of the pause button. Resuming under reduced motion is an explicit play. */
export function toggleIntent(intent: PlayIntent, reduced: boolean): PlayIntent {
  if (!isPaused(intent, reduced)) return "paused";
  return reduced ? "playing" : "auto";
}

export interface PlaybackState {
  intent: PlayIntent;
  reduced: boolean;
  /** The screen holds a src (pickArmed). */
  armed: boolean;
  /** At least 60% of the screen is on screen. */
  visible: boolean;
}

export function shouldPlay({ intent, reduced, armed, visible }: PlaybackState): boolean {
  return armed && visible && !isPaused(intent, reduced);
}
