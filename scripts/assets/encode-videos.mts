/**
 * Encodes the reel recordings and their posters.   npm run assets:video [-- slug …]
 *   node scripts/assets/encode-videos.mts matchme pickanddink horizon   (only those clips)
 *
 * For each slug (all of them when none is given), starting `startAt` seconds into the master:
 * - public/videos/{slug}-{1280|720}.{av1|h264}.mp4: 16:10 cover crop anchored at the top (or native aspect for
 *   contain), 30 fps CFR, no audio, bt709, faststart. Each at the lowest CRF that fits its target: the per-file
 *   budget, scaled so all 28 files fit the 30 MB total.
 * - public/posters/{slug}-{1280|720}.{avif,webp}: the clip's poster frame with the same crop or fit, at the highest
 *   quality that fits the poster budget.
 * The old public/videos/*.mp4 and public/posters/*.jpg are left alone (T6 deletes them).
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { encodeArgs, posterFilter, posterFrameArgs, videoFilter } from "../lib/ffmpeg-args.mts";
import type { SourceFrame, VideoCodec } from "../lib/ffmpeg-args.mts";
import { probeVideo } from "../lib/ffprobe.mts";
import {
  CLIPS,
  POSTER_BUDGET,
  POSTER_FORMATS,
  POSTER_WIDTHS,
  RENDITIONS,
  SLUGS,
  VIDEO_BUDGET,
  VIDEO_TOTAL_BUDGET,
  posterFile,
  videoFile,
  videoTarget,
} from "../lib/media.mts";
import type { PosterFormat, Slug } from "../lib/media.mts";
import { fromRoot } from "../lib/paths.mts";
import { searchQuality } from "../lib/quality-search.mts";
import { run, runBuffer } from "../lib/run.mts";

/** CRF search bounds. `best` is the quality ceiling: below it, extra bytes stop buying visible quality. */
const CRF_RANGE: Record<VideoCodec, { best: number; worst: number }> = {
  h264: { best: 23, worst: 40 },
  av1: { best: 30, worst: 55 },
};

/** Image quality search bounds for the posters (sharp's 1–100 scale). */
const POSTER_QUALITY = { best: 80, worst: 10 };

const kb = (bytes: number): string => `${(bytes / 1000).toFixed(1)} KB`;
const mb = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

/** Copies a master that only exists in public/videos/ into video-sources/ (Ruling R7: copy, don't move). */
function ensureSource(slug: Slug): string {
  const clip = CLIPS[slug];
  const source = fromRoot(clip.source);
  if (!existsSync(source)) {
    if (!clip.copyFrom) throw new Error(`Missing master ${clip.source}`);
    mkdirSync(fromRoot("video-sources"), { recursive: true });
    copyFileSync(fromRoot(clip.copyFrom), source);
    console.log(`copied ${clip.copyFrom} → ${clip.source}`);
  }
  return source;
}

async function encodeVideos(slug: Slug, source: string, frame: SourceFrame, workDir: string): Promise<number> {
  const clip = CLIPS[slug];
  let total = 0;
  for (const { codec, width } of RENDITIONS) {
    const filter = videoFilter(frame, clip.fit, width);
    const attempt = (crf: number): string => join(workDir, `${slug}-${width}.${codec}.crf${crf}.mp4`);
    const result = await searchQuality({
      ...CRF_RANGE[codec],
      budget: videoTarget(width, codec),
      measure: (crf) => {
        run("ffmpeg", encodeArgs({ input: source, startAt: clip.startAt, output: attempt(crf), filter, codec, crf }));
        return statSync(attempt(crf)).size;
      },
    });
    const out = videoFile(slug, width, codec);
    copyFileSync(attempt(result.setting), fromRoot("public", out));
    total += result.bytes;
    console.log(
      `  ${out.padEnd(34)} crf ${String(result.setting).padStart(2)}  ${mb(result.bytes)}` +
        `  (target ${mb(videoTarget(width, codec))}, budget ${mb(VIDEO_BUDGET[width][codec])}; tried ${result.tried.join(", ")})`,
    );
  }
  return total;
}

async function encodePoster(still: Buffer, format: PosterFormat, quality: number): Promise<Buffer> {
  const image = sharp(still);
  return format === "avif" ? image.avif({ quality, effort: 6 }).toBuffer() : image.webp({ quality, effort: 6 }).toBuffer();
}

async function encodePosters(slug: Slug, source: string, frame: SourceFrame): Promise<void> {
  const clip = CLIPS[slug];
  for (const width of POSTER_WIDTHS) {
    const seconds = (clip.startAt ?? 0) + clip.posterAt;
    const still = runBuffer("ffmpeg", posterFrameArgs({ input: source, seconds, filter: posterFilter(frame, clip.fit, width) }));
    for (const format of POSTER_FORMATS) {
      const encoded = new Map<number, Buffer>();
      const result = await searchQuality({
        ...POSTER_QUALITY,
        budget: POSTER_BUDGET[width],
        measure: async (quality) => {
          const buffer = await encodePoster(still, format, quality);
          encoded.set(quality, buffer);
          return buffer.length;
        },
      });
      const out = posterFile(slug, width, format);
      const chosen = encoded.get(result.setting);
      if (!chosen) throw new Error(`No encode kept for ${out} at q ${result.setting}`);
      writeFileSync(fromRoot("public", out), chosen);
      console.log(`  ${out.padEnd(34)} q ${String(result.setting).padStart(3)}  ${kb(result.bytes)} / ${kb(POSTER_BUDGET[width])}`);
    }
  }
}

const isSlug = (arg: string): arg is Slug => (SLUGS as readonly string[]).includes(arg);

/** The slugs named on the command line, or every slug when none is. */
function requestedSlugs(args: readonly string[]): readonly Slug[] {
  const unknown = args.filter((arg) => !isSlug(arg));
  if (unknown.length > 0) throw new Error(`Unknown slug(s) ${unknown.join(", ")}; expected ${SLUGS.join(", ")}`);
  return args.length > 0 ? SLUGS.filter((slug) => args.includes(slug)) : SLUGS;
}

/** Every rendition of every clip on disk, so a partial run still checks the whole 30 MB total. */
function videoTotalOnDisk(): number {
  let total = 0;
  for (const slug of SLUGS) {
    for (const { codec, width } of RENDITIONS) {
      const file = fromRoot("public", videoFile(slug, width, codec));
      if (existsSync(file)) total += statSync(file).size;
      else console.warn(`  missing public/${videoFile(slug, width, codec)}`);
    }
  }
  return total;
}

async function main(): Promise<void> {
  const slugs = requestedSlugs(process.argv.slice(2));
  mkdirSync(fromRoot("public/videos"), { recursive: true });
  mkdirSync(fromRoot("public/posters"), { recursive: true });
  const workDir = mkdtempSync(join(tmpdir(), "encode-videos-"));
  let encoded = 0;
  try {
    for (const slug of slugs) {
      const clip = CLIPS[slug];
      const source = ensureSource(slug);
      const probe = probeVideo(source);
      const frame: SourceFrame = { width: probe.width, height: probe.height, cropTop: clip.cropTop };
      const trim = clip.startAt ? `, from ${clip.startAt}s` : "";
      console.log(`${slug}: ${clip.source} ${probe.width}×${probe.height}, ${probe.duration.toFixed(2)}s${trim}, ${clip.fit}`);
      encoded += await encodeVideos(slug, source, frame, workDir);
      await encodePosters(slug, source, frame);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
  const total = videoTotalOnDisk();
  console.log(`encoded ${mb(encoded)}; total video (all ${SLUGS.length} clips) ${mb(total)} / ${mb(VIDEO_TOTAL_BUDGET)}`);
  if (total > VIDEO_TOTAL_BUDGET) {
    throw new Error(`Videos total ${total} B, over the ${VIDEO_TOTAL_BUDGET} B budget; re-encode the clips not encoded in this run`);
  }
}

await main();
