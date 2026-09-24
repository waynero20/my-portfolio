/** The reel clips, their per-clip encode decisions, budgets and output paths. Shared by the video scripts. */
import type { Fit, VideoCodec } from "./ffmpeg-args.mts";

export const SLUGS = ["bloom", "legacy", "tampus", "tutorloop", "horizon", "matchme", "pickanddink"] as const;
export type Slug = (typeof SLUGS)[number];

export type RenditionWidth = 1280 | 720;
export type PosterFormat = "avif" | "webp";

export interface Rendition {
  codec: VideoCodec;
  width: RenditionWidth;
}

/** Manifest and <source> order: AV1 before H.264, and 1280 before 720 within each codec. */
export const RENDITIONS: readonly Rendition[] = [
  { codec: "av1", width: 1280 },
  { codec: "av1", width: 720 },
  { codec: "h264", width: 1280 },
  { codec: "h264", width: 720 },
];

export const POSTER_WIDTHS: readonly RenditionWidth[] = [1280, 720];
export const POSTER_FORMATS: readonly PosterFormat[] = ["avif", "webp"];

export interface Clip {
  /** Repo-relative master in video-sources/ (gitignored). */
  source: string;
  /** Where to copy the master from when it only exists in public/videos/ (Ruling R7: copy, never move). */
  copyFrom?: string;
  /** Decided by looking at stills: cover crops 16:10 from the top; contain keeps the native aspect. */
  fit: Fit;
  /** Height of the macOS menu-bar strip (black, with the orange mic dot) at the top of the .mov recordings. */
  cropTop: number;
  /**
   * Seconds cut from the start of the master (an input `-ss`), so the encodes begin here and the posters, the
   * ambilight track and the manifest's duration all see the trimmed clip.
   */
  startAt?: number;
  /** Poster frame time in seconds into the trimmed clip (after `startAt`), picked by looking at stills. */
  posterAt: number;
}

export const CLIPS: Record<Slug, Clip> = {
  // Below the 68px menu-bar strip, a 16:10 crop of the 2940×1912 masters trims only 6 rows from the bottom.
  bloom: { source: "video-sources/bloomandblossom.mov", fit: "cover", cropTop: 68, posterAt: 0 },
  legacy: { source: "video-sources/legacysmiles.mov", fit: "cover", cropTop: 68, posterAt: 0 },
  // At ~1.92:1 a 16:10 crop would cut the logo, nav, "BOOK NOW" and the hero headline's first letters.
  tampus: {
    source: "video-sources/tampusdentalclinic.mp4",
    copyFrom: "public/videos/tampusdentalclinic.mp4",
    fit: "contain",
    cropTop: 0,
    posterAt: 0,
  },
  tutorloop: { source: "video-sources/tutorloop.mov", fit: "cover", cropTop: 68, posterAt: 0 },
  // At ~1.91:1 a 16:10 crop would cut table text, the status and actions columns and the logo.
  // 0–5s is the login form with email autocomplete (a personal address), 6s a "Redirecting…" page, and 7–9.3s
  // Chrome's "password found in a data breach" dialog fading out (a ghost of it is still there at 9.28s). The
  // poster is the loaded dashboard with no hover UI (11.6s in the master).
  horizon: {
    source: "video-sources/horizon-erp.mp4",
    copyFrom: "public/videos/horizon-erp.mp4",
    fit: "contain",
    cropTop: 0,
    startAt: 9.35,
    posterAt: 2.25,
  },
  // 2936×1542 screen recordings (~1.9:1, no menu-bar strip) that open on the loaded hero. A 16:10 crop would cut
  // Match Me's header mark in the order flow; Pick & Dink is the same capture, so it is letterboxed the same way.
  matchme: {
    source: "video-sources/matchme.mov",
    copyFrom: "public/videos/matchme.mov",
    fit: "contain",
    cropTop: 0,
    posterAt: 0,
  },
  pickanddink: {
    source: "video-sources/pickanddink.mov",
    copyFrom: "public/videos/pickanddink.mov",
    fit: "contain",
    cropTop: 0,
    posterAt: 0,
  },
};

/** Per-file video budgets in bytes (decimal MB). */
export const VIDEO_BUDGET: Record<RenditionWidth, Record<VideoCodec, number>> = {
  1280: { h264: 3_000_000, av1: 1_800_000 },
  720: { h264: 1_200_000, av1: 800_000 },
};

/** All renditions of all clips together. */
export const VIDEO_TOTAL_BUDGET = 30_000_000;

const BUDGET_SUM = SLUGS.length * RENDITIONS.reduce((sum, { codec, width }) => sum + VIDEO_BUDGET[width][codec], 0);

/**
 * The size each encode aims for: its per-file budget, scaled down by the same factor for every file when the
 * per-file budgets together exceed the total (7 × 6.8 MB = 47.6 MB > 30 MB, so ×0.63), so every clip gives up
 * the same share.
 */
export function videoTarget(width: RenditionWidth, codec: VideoCodec): number {
  const scale = Math.min(1, VIDEO_TOTAL_BUDGET / BUDGET_SUM);
  return Math.floor(VIDEO_BUDGET[width][codec] * scale);
}

/** Per-file poster budgets in bytes (decimal KB). */
export const POSTER_BUDGET: Record<RenditionWidth, number> = { 1280: 60_000, 720: 25_000 };

/** Video path relative to public/ (and, with a leading slash, its URL). */
export const videoFile = (slug: Slug, width: RenditionWidth, codec: VideoCodec): string =>
  `videos/${slug}-${width}.${codec}.mp4`;

/** Poster path relative to public/ (and, with a leading slash, its URL). */
export const posterFile = (slug: Slug, width: RenditionWidth, format: PosterFormat): string =>
  `posters/${slug}-${width}.${format}`;
