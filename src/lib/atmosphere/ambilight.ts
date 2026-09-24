// Ambilight tracks: the recordings' left and right edge colours, sampled at build time by
// `npm run assets:ambi` into /public/ambi/{slug}.json as {v: 1, fps: 4, frames, l: "rrggbb…",
// r: "rrggbb…"}. Pure parsing and sampling plus a cached loader; useAmbilight is the one runtime
// consumer (and the only requestVideoFrameCallback loop). No DOM access at import time.

import type { Hex, ReelSlug } from "@/lib/types";

export type Rgb = readonly [number, number, number];

export interface AmbiTrack {
  fps: number;
  frames: number;
  /** frames × [r, g, b], 0–255. */
  l: Uint8Array;
  r: Uint8Array;
}

export interface AmbiSample {
  l: Rgb;
  r: Rgb;
}

const HEX_PAIRS = /^(?:[0-9a-f]{2})*$/i;

function decodeColours(value: unknown, frames: number): Uint8Array | null {
  if (typeof value !== "string" || value.length !== frames * 6 || !HEX_PAIRS.test(value)) return null;
  const bytes = new Uint8Array(frames * 3);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** A track from the JSON, or null for anything that isn't a well-formed v1 track. */
export function parseAmbi(json: unknown): AmbiTrack | null {
  if (typeof json !== "object" || json === null) return null;
  const { v, fps, frames, l, r } = json as Record<string, unknown>;
  if (v !== 1 || typeof fps !== "number" || !(fps > 0)) return null;
  if (typeof frames !== "number" || !Number.isInteger(frames) || frames < 1) return null;
  const left = decodeColours(l, frames);
  const right = decodeColours(r, frames);
  return left && right ? { fps, frames, l: left, r: right } : null;
}

function lerpFrame(colours: Uint8Array, from: number, to: number, t: number): Rgb {
  const channel = (c: number) => colours[from * 3 + c] + (colours[to * 3 + c] - colours[from * 3 + c]) * t;
  return [channel(0), channel(1), channel(2)];
}

/**
 * The edge colours at `mediaTime` seconds, interpolated between the two nearest samples. The clips
 * loop, so the last sample blends back into the first.
 */
export function sampleAmbi(track: AmbiTrack, mediaTime: number): AmbiSample {
  const position = Math.max(0, mediaTime) * track.fps;
  const whole = Math.floor(position);
  const from = whole % track.frames;
  const to = (from + 1) % track.frames;
  const t = position - whole;
  return { l: lerpFrame(track.l, from, to, t), r: lerpFrame(track.r, from, to, t) };
}

/** Rounds to whole 0–255 channels (changes under 1/255 are not changes). */
export function roundRgb([r, g, b]: Rgb): Rgb {
  return [Math.round(r), Math.round(g), Math.round(b)];
}

export function sameRgb(a: Rgb, b: Rgb): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function rgbToHex(rgb: Rgb): Hex {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const tracks = new Map<ReelSlug, Promise<AmbiTrack | null>>();

/** The reel's track, fetched once per page; null when it is missing or malformed. */
export function loadAmbi(slug: ReelSlug): Promise<AmbiTrack | null> {
  let track = tracks.get(slug);
  if (!track) {
    track = fetch(`/ambi/${slug}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then(parseAmbi)
      .catch(() => null);
    tracks.set(slug, track);
  }
  return track;
}
