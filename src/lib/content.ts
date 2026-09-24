// Pure selectors over data.ts, plus getMedia(slug) over the generated media manifest (Ruling R6).

import type { Project, ReelSlug } from "@/lib/types";

import { EDITIONS, PROCESS, PROJECTS, SITE, TOOLS } from "@/lib/data";
import manifest from "@/lib/generated/media-manifest.json";

export { nightThemeHex } from "@/lib/theme";

export type VideoCodec = "av1" | "h264";

/** One encoded rendition. `type` carries the codecs string, for canPlayType(). */
export interface VideoSource {
  src: string;
  type: string;
  width: number;
  codec: VideoCodec;
}

/** A reel's recording, as `npm run assets:manifest` writes it. Sources run AV1 then H.264, 1280 then 720. */
export interface ReelMedia {
  w: number;
  h: number;
  duration: number;
  /** cover: cropped to 16:10 from the top. contain: the native aspect, on the brand surface. */
  fit: "cover" | "contain";
  posters: Record<"720" | "1280", { avif: string; webp: string }>;
  sources: readonly VideoSource[];
}

// The JSON types fit and codec as plain strings; content.test.ts checks the real values.
const MEDIA = manifest as Partial<Record<string, ReelMedia>>;

/** A piece of content Wayne still has to supply: the data.ts path and what is needed. */
export interface ContentGap {
  field: string;
  note: string;
}

export function getProject(slug: ReelSlug): Project {
  const project = PROJECTS.find((candidate) => candidate.slug === slug);
  if (!project) throw new Error(`No project with slug "${slug}"`);
  return project;
}

/** The reel's posters and video sources from src/lib/generated/media-manifest.json. */
export function getMedia(slug: ReelSlug): ReelMedia {
  const media = MEDIA[slug];
  if (!media) throw new Error(`No media for slug "${slug}". Run npm run assets:manifest.`);
  return media;
}

/**
 * Every null or unconfirmed field in data.ts (each is marked TODO(wayne) there). Drafts whose
 * shape has no null or `confirmed` field (service deliverables, TutorLoop's naming, the contact
 * notes) are marked TODO(wayne) only and cannot be listed here.
 */
export function listContentGaps(): ContentGap[] {
  const gaps: ContentGap[] = [];
  const addIf = (isGap: boolean, field: string, note: string) => {
    if (isGap) gaps.push({ field, note });
  };

  addIf(SITE.resume === null, "SITE.resume", "Add the résumé PDF. The Résumé links stay hidden until then.");
  for (const [edition, { confirmed }] of Object.entries(EDITIONS)) {
    addIf(!confirmed, `EDITIONS.${edition}`, `Confirm the ${edition}-edition lead. The draft is shown until then.`);
  }
  for (const { slug, title, market, outcome, stackConfirmed } of PROJECTS) {
    addIf(market === null, `PROJECTS[${slug}].market`, `Which market does ${title} serve? Hidden until set.`);
    addIf(outcome === null, `PROJECTS[${slug}].outcome`, `A one-line outcome for ${title}. Hidden until set.`);
    addIf(!stackConfirmed, `PROJECTS[${slug}].stack`, `Confirm the ${title} stack.`);
  }
  for (const { tag, title, confirmed } of PROCESS) {
    addIf(!confirmed, `PROCESS[${tag}]`, `Confirm the "${title}" copy. The draft is shown until then.`);
  }
  for (const { id, name, why } of TOOLS) {
    addIf(why === null, `TOOLS[${id}].why`, `Why ${name}? The line is hidden until set.`);
  }

  return gaps;
}
