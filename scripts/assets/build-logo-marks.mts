/**
 * Builds the small project logo marks.   npm run assets:logos
 *
 * Each project's logo (PROJECTS[].logo.src, under public/) is trimmed of its transparent or flat
 * margin, then fitted into a transparent MARK_PX square, so every mark fills its tile the same way
 * whatever padding the source has (TutorLoop's sits small in a wide canvas). ProjectLogo
 * (src/components/ui/project-logo.tsx) shows them on a tile in the brand's own surface colour,
 * wherever a project used to be marked with a coloured dot (Wayne's W12).
 *
 * Outputs public/logos/marks/{slug}.webp.
 */
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { PROJECTS } from "../../src/lib/data.ts";
import { fromRoot } from "../lib/paths.mts";

/** The mark's square side in px: 2× the largest tile (40px) plus headroom for 3× screens. */
const MARK_PX = 160;
const OUT_DIR = fromRoot("public/logos/marks");
/** Source budget only: next/image re-encodes each mark at the tile size it is shown at. */
const BUDGET_BYTES = 20_000;

mkdirSync(OUT_DIR, { recursive: true });

for (const { slug, logo } of PROJECTS) {
  const source = fromRoot("public", logo.src);
  // trim() keys off the top-left pixel: transparent margins on the cut-outs, flat ones otherwise.
  const trimmed = await sharp(source).ensureAlpha().trim({ threshold: 12 }).toBuffer();
  const out = join(OUT_DIR, `${slug}.webp`);
  await sharp(trimmed)
    .resize(MARK_PX, MARK_PX, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(out);
  const bytes = statSync(out).size;
  console.log(`${slug.padEnd(12)} ${bytes} B${bytes > BUDGET_BYTES ? "  (over the 20 KB budget)" : ""}`);
}
