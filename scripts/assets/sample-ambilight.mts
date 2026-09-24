/**
 * Bakes the ambilight tracks.   npm run assets:ambi   (after assets:video)
 *
 * Samples each public/videos/{slug}-1280.h264.mp4 at 4 fps and writes public/ambi/{slug}.json:
 * {v:1, fps:4, frames:N, l:"rrggbb…", r:"rrggbb…"}, the average colour of the left and right 8% edge strips per frame.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ambilightTrack } from "../lib/ambilight.mts";
import { ambilightArgs } from "../lib/ffmpeg-args.mts";
import { SLUGS, videoFile } from "../lib/media.mts";
import { fromRoot } from "../lib/paths.mts";
import { runBuffer } from "../lib/run.mts";

const FPS = 4;
const EDGE_FRACTION = 0.08;
/** ffmpeg area-averages each frame down to this grid; 100 columns make each 8% strip exactly 8 columns. */
const GRID = { width: 100, height: 60 };

function main(): void {
  mkdirSync(fromRoot("public/ambi"), { recursive: true });
  for (const slug of SLUGS) {
    const input = fromRoot("public", videoFile(slug, 1280, "h264"));
    const raw = runBuffer("ffmpeg", ambilightArgs({ input, fps: FPS, ...GRID }));
    const track = ambilightTrack(raw, { ...GRID, fps: FPS, edgeFraction: EDGE_FRACTION });
    const out = fromRoot("public/ambi", `${slug}.json`);
    writeFileSync(out, `${JSON.stringify(track)}\n`);
    console.log(`${out}  ${track.frames} frames  ${statSync(out).size} B`);
  }
}

main();
