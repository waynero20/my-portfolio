/**
 * Writes src/lib/generated/media-manifest.json from the encoded files.   npm run assets:manifest   (after assets:video)
 *
 * {[slug]: {w, h, duration, fit, posters: {"1280": {avif, webp}, "720": {avif, webp}}, sources: [{src, type, width, codec}]}}
 * Every value is read from the files with ffprobe. Sources are AV1 before H.264, and 1280 before 720 within each codec.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { OUTPUT_ASPECT, mimeType } from "../lib/ffmpeg-args.mts";
import type { Fit, VideoCodec } from "../lib/ffmpeg-args.mts";
import { probeVideo } from "../lib/ffprobe.mts";
import type { VideoProbe } from "../lib/ffprobe.mts";
import { CLIPS, POSTER_FORMATS, POSTER_WIDTHS, RENDITIONS, SLUGS, posterFile, videoFile } from "../lib/media.mts";
import type { PosterFormat, Slug } from "../lib/media.mts";
import { fromRoot } from "../lib/paths.mts";

const MANIFEST_JSON = fromRoot("src/lib/generated/media-manifest.json");

interface ManifestSource {
  src: string;
  type: string;
  width: number;
  codec: VideoCodec;
}

interface ManifestEntry {
  w: number;
  h: number;
  duration: number;
  fit: Fit;
  posters: Record<string, Record<PosterFormat, string>>;
  sources: ManifestSource[];
}

function publicUrl(file: string): string {
  if (!existsSync(fromRoot("public", file))) throw new Error(`Missing public/${file}; run npm run assets:video`);
  return `/${file}`;
}

function entryFor(slug: Slug): ManifestEntry {
  const probes: { codec: VideoCodec; file: string; probe: VideoProbe }[] = RENDITIONS.map(({ codec, width }) => {
    const file = videoFile(slug, width, codec);
    publicUrl(file);
    const probe = probeVideo(fromRoot("public", file));
    if (probe.codecName !== codec || probe.width !== width) {
      throw new Error(`public/${file} is ${probe.codecName} ${probe.width}px, expected ${codec} ${width}px`);
    }
    return { codec, file, probe };
  });

  // Display size and duration come from the 1280 H.264, the rendition every browser can play.
  const main = probes.find((p) => p.codec === "h264" && p.probe.width === 1280)?.probe;
  if (!main) throw new Error(`No 1280 H.264 rendition for ${slug}`);
  const fit = CLIPS[slug].fit;
  if (fit === "cover" && Math.abs(main.width / main.height - OUTPUT_ASPECT) > 0.01) {
    throw new Error(`${slug} is marked cover but encodes at ${main.width}×${main.height}; re-run assets:video`);
  }

  return {
    w: main.width,
    h: main.height,
    duration: Math.round(main.duration * 1000) / 1000,
    fit,
    posters: Object.fromEntries(
      POSTER_WIDTHS.map((width) => [
        String(width),
        Object.fromEntries(POSTER_FORMATS.map((format) => [format, publicUrl(posterFile(slug, width, format))])) as Record<
          PosterFormat,
          string
        >,
      ]),
    ),
    sources: probes.map(({ codec, file, probe }) => ({
      src: `/${file}`,
      type: mimeType(codec, probe.extradata),
      width: probe.width,
      codec,
    })),
  };
}

function main(): void {
  const manifest = Object.fromEntries(SLUGS.map((slug) => [slug, entryFor(slug)]));
  mkdirSync(dirname(MANIFEST_JSON), { recursive: true });
  writeFileSync(MANIFEST_JSON, `${JSON.stringify(manifest, null, 2)}\n`);
  for (const [slug, entry] of Object.entries(manifest)) {
    console.log(`${slug.padEnd(10)} ${entry.w}×${entry.h} ${entry.duration}s ${entry.fit.padEnd(7)} ${entry.sources.map((s) => s.type).join(" | ")}`);
  }
  console.log(`${MANIFEST_JSON}  ${statSync(MANIFEST_JSON).size} B`);
}

main();
