/**
 * Builds the hero's portrait.   npm run assets:portrait   (then npm run assets:dissolve)
 *
 * One bust, Wayne's photo (public/hero/face.png: head, neck and black tee, cut flat at the bottom row),
 * in two looks that share its box exactly:
 * - public/hero/portrait-{480,768,992}.{avif,webp}: the colour photo, the resting image. Its chest drops
 *   out in Bayer cells on the x-ray's lattice well above the flat cut (scripts/lib/portrait.mts DISSOLVE,
 *   dropOut), so the cut can never show and the dissolve's dots take over, and the neck carries a soft
 *   chin shadow (NECK_SHADE) so RONDINA holds its contrast across it.
 * - public/hero/portrait-xray.png: the x-ray develop, a 1-bit ordered (Bayer) dither of bone dots,
 *   FRAMES frames coarse to fine in one horizontal strip. Every frame is stored at the finest cell grid,
 *   so the strip is tiny and the page scales it up with image-rendering: pixelated. The first frame is
 *   also inlined as a data URI for the first paint.
 * - src/lib/generated/portrait.ts: PORTRAIT, the rig in source px ("u"): the head box, the image sets
 *   and the x-ray box. The dissolve's dot layers are build-dissolve.mts's (generated/dissolve.ts).
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import sharp from "sharp";
import { alphaBounds, bayerThreshold, boxDownsample, luma, nearestUpscale } from "../lib/dither.mts";
import type { Rgb } from "../lib/dither.mts";
import { ROOT, fromRoot } from "../lib/paths.mts";
import {
  CHIN_LINE,
  SOURCE,
  XRAY_BOX,
  assertChinInNeck,
  dropOut,
  fadeAt,
  shadeNeck,
  spanBetween,
  toneMap,
  widthProfile,
} from "../lib/portrait.mts";
import type { Tone } from "../lib/portrait.mts";

const PORTRAIT_TS = fromRoot("src/lib/generated/portrait.ts");
const SOURCE_FILE = fromRoot("public/hero/face.png");

/** Widths of the colour photo (the source is 992 wide, so nothing is upscaled). */
const WIDTHS = [480, 768, 992] as const;
/** The phone-sized AVIF and the largest AVIF must stay under these. */
const BUDGET = { phoneAvif: 45_000, desktopAvif: 90_000, xray: 10_000 } as const;

/** x-ray cell sizes in u, coarse to fine. Each divides every coarser one, and all divide the x-ray box. */
const CELLS = [32, 24, 16, 12, 8, 4] as const;
const REST_CELL = CELLS[CELLS.length - 1];
const GRID_W = XRAY_BOX.w / REST_CELL;
const GRID_H = XRAY_BOX.h / REST_CELL;

const BONE: Rgb = [0xed, 0xe9, 0xe3];
const BLACKOUT: Rgb = [0x06, 0x07, 0x08];

/**
 * Gamma 1.4 darkens the skin midtones so the eyes, nose, mouth and jaw keep their structure at the finest
 * cell; the lift keeps sparse dots in the black tee and the hair, so they read as a dark x-ray mass
 * rather than a hole.
 */
const TONE: Tone = { lo: 0.02, hi: 0.995, gamma: 1.4, lift: 0.06 };

interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
}

async function readRgba(input: string | Buffer, raw?: { width: number; height: number }): Promise<RawImage> {
  const pipeline = raw ? sharp(input, { raw: { ...raw, channels: 4 } }) : sharp(input);
  const { data, info } = await pipeline.toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

/** Same alpha everywhere and same colour wherever visible (a palette PNG gives transparent pixels any RGB). */
function looksIdentical(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (a[i + 3] > 0 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) return false;
  }
  return true;
}

/** A palette PNG of a 1-bit RGBA buffer, checked to decode back to exactly the same pixels. */
async function exactPng(data: Uint8Array, width: number, height: number): Promise<Buffer> {
  const png = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .png({ palette: true, colours: 4, dither: 0, compressionLevel: 9, effort: 10 })
    .toBuffer();
  const decoded = await readRgba(png);
  if (!looksIdentical(decoded.data, data)) throw new Error("The palette PNG did not keep every pixel exact");
  return png;
}

/** The source placed in the x-ray box (transparent padding around it). */
function inXrayBox(image: RawImage): Uint8Array {
  const out = new Uint8Array(XRAY_BOX.w * XRAY_BOX.h * 4);
  for (let y = 0; y < XRAY_BOX.h; y++) {
    const sy = y + XRAY_BOX.y;
    if (sy < 0 || sy >= image.height) continue;
    for (let x = 0; x < XRAY_BOX.w; x++) {
      const sx = x + XRAY_BOX.x;
      if (sx < 0 || sx >= image.width) continue;
      out.set(image.data.subarray((sy * image.width + sx) * 4, (sy * image.width + sx + 1) * 4), (y * XRAY_BOX.w + x) * 4);
    }
  }
  return out;
}

/** The largest alpha in each cell×cell block: the x-ray's silhouette covers the photo's, so no colour edge peeks out. */
function maxAlpha(rgba: Uint8Array, width: number, height: number, cell: number): Uint8Array {
  const cols = width / cell;
  const rows = height / cell;
  const out = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = Math.floor(y / cell) * cols + Math.floor(x / cell);
      out[o] = Math.max(out[o], rgba[(y * width + x) * 4 + 3]);
    }
  }
  return out;
}

/**
 * One 1-bit frame at `cell`: bone where the cell's tone beats the Bayer threshold, blackout paper
 * elsewhere inside the silhouette. The bottom fade is dithered too (a cell survives where the fade
 * beats a second threshold), so the x-ray runs on into the dissolve's dots the way the photo does.
 */
function ditherFrame(grey: Uint8Array, shape: Uint8Array, cell: number): { bits: Uint8Array; cols: number; rows: number } {
  const cols = XRAY_BOX.w / cell;
  const rows = XRAY_BOX.h / cell;
  const tone = boxDownsample(grey, XRAY_BOX.w, XRAY_BOX.h, cell);
  const edge = maxAlpha(shape, XRAY_BOX.w, XRAY_BOX.h, cell);
  const bits = new Uint8Array(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = y * cols + x;
      if (edge[c] < 128) continue;
      const cx = XRAY_BOX.x + (x + 0.5) * cell;
      const cy = XRAY_BOX.y + (y + 0.5) * cell;
      if (fadeAt(cx, cy, SOURCE.width, SOURCE.height) <= bayerThreshold(x + 3, y + 5)) continue;
      const i = c * 4;
      bits.set(luma(tone[i], tone[i + 1], tone[i + 2]) > bayerThreshold(x, y) ? BONE : BLACKOUT, i);
      bits[i + 3] = 255;
    }
  }
  return { bits, cols, rows };
}

/** Where the head is: crown (the first opaque row) to the chin line, ear to ear. */
function measureHead(image: RawImage) {
  assertChinInNeck(widthProfile(image.data, image.width, image.height), CHIN_LINE);
  const top = alphaBounds(image.data, image.width, image.height, 128).top;
  const span = spanBetween(image.data, image.width, image.height, top, CHIN_LINE);
  return { x: span.left, y: top, w: span.width, h: CHIN_LINE - top };
}

/** The colour photo at every width: resized, then its chest dropped out at that size (dropOut). */
async function writeColour(shaded: RawImage): Promise<{ avif: string; webp: string; sizes: Map<string, number> }> {
  const sizes = new Map<string, number>();
  const sets = { avif: [] as string[], webp: [] as string[] };
  for (const width of WIDTHS) {
    const height = Math.round((SOURCE.height * width) / SOURCE.width);
    const resized = await readRgba(
      await sharp(Buffer.from(shaded.data), { raw: { width: shaded.width, height: shaded.height, channels: 4 } })
        .resize(width, height, { kernel: "lanczos3" })
        .raw()
        .toBuffer(),
      { width, height },
    );
    const photo = sharp(Buffer.from(dropOut(resized.data, width, height)), { raw: { width, height, channels: 4 } });
    for (const format of ["avif", "webp"] as const) {
      const file = fromRoot(`public/hero/portrait-${width}.${format}`);
      const encoded =
        format === "avif"
          ? photo.clone().avif({ quality: 64, effort: 9, chromaSubsampling: "4:2:0" })
          : photo.clone().webp({ quality: 82, alphaQuality: 82, effort: 6, smartSubsample: true });
      await encoded.toFile(file);
      sizes.set(`${width}.${format}`, statSync(file).size);
      sets[format].push(`/hero/portrait-${width}.${format} ${width}w`);
      console.log(`${relative(ROOT, file)}  ${width}×${height}  ${statSync(file).size} B`);
    }
  }
  return { avif: sets.avif.join(", "), webp: sets.webp.join(", "), sizes };
}

const box = (b: { x: number; y: number; w: number; h: number }): string =>
  `{ x: ${Math.round(b.x * 10) / 10}, y: ${Math.round(b.y * 10) / 10}, w: ${Math.round(b.w * 10) / 10}, h: ${Math.round(b.h * 10) / 10} }`;

async function main(): Promise<void> {
  if (!existsSync(SOURCE_FILE)) throw new Error(`${relative(ROOT, SOURCE_FILE)} is missing`);
  const image = await readRgba(SOURCE_FILE);
  if (image.width !== SOURCE.width || image.height !== SOURCE.height) {
    throw new Error(`face.png is ${image.width}×${image.height}; scripts/lib/portrait.mts expects ${SOURCE.width}×${SOURCE.height}`);
  }
  const head = measureHead(image);
  mkdirSync(fromRoot("public/hero"), { recursive: true });

  // The colour photo: the neck shaded under the chin (RONDINA's contrast), the chest dropping out.
  const colour = await writeColour({ ...image, data: shadeNeck(image.data, image.width, image.height) });

  // The x-ray: tone-mapped grey in the x-ray box, dithered at every cell size.
  const framed = inXrayBox(image);
  const grey = toneMap(framed, TONE);
  const frames = CELLS.map((cell) => ditherFrame(grey, framed, cell));
  const strip = new Uint8Array(GRID_W * CELLS.length * GRID_H * 4);
  frames.forEach(({ bits, cols, rows }, f) => {
    const grid = nearestUpscale(bits, cols, rows, CELLS[f] / REST_CELL);
    for (let y = 0; y < GRID_H; y++) {
      strip.set(grid.subarray(y * GRID_W * 4, (y + 1) * GRID_W * 4), (y * GRID_W * CELLS.length + f * GRID_W) * 4);
    }
  });
  const xrayFile = fromRoot("public/hero/portrait-xray.png");
  const xray = await exactPng(strip, GRID_W * CELLS.length, GRID_H);
  writeFileSync(xrayFile, xray);
  const frame0 = await exactPng(frames[0].bits, frames[0].cols, frames[0].rows);
  console.log(`${relative(ROOT, xrayFile)}  ${GRID_W * CELLS.length}×${GRID_H}  ${xray.length} B  frame0 ${frame0.length} B`);

  mkdirSync(dirname(PORTRAIT_TS), { recursive: true });
  writeFileSync(
    PORTRAIT_TS,
    `// Generated by scripts/assets/build-portrait.mts (npm run assets:portrait). Do not edit.

/**
 * The hero's bust rig. Every box is in source px of public/hero/face.png ("u"), from its top-left
 * corner; hero.css scales u to CSS px with --s (the head's CSS height over head.h).
 * - head: crown to the chin line, ear to ear. The layout sizes the head (--m) from this box.
 * - photo: the colour bust (the resting image) as AVIF and WebP srcsets; its chest drops out in Bayer
 *   cells well above the flat cut, where the dissolve takes over.
 * - xray: the develop, \`frames\` 1-bit frames (coarse to fine) of \`frameWidth\` × \`frameHeight\` px in one
 *   horizontal strip, covering \`box\`. Render with image-rendering: pixelated. frame0 is the coarsest,
 *   inline, for the first paint.
 * The dissolve's dot layers, on the same lattice, are in generated/dissolve.ts (build-dissolve.mts).
 */
export const PORTRAIT = {
  width: ${SOURCE.width},
  height: ${SOURCE.height},
  head: ${box(head)},
  photo: {
    avif: "${colour.avif}",
    webp: "${colour.webp}",
    fallback: "/hero/portrait-${WIDTHS[1]}.webp",
  },
  xray: {
    src: "/hero/portrait-xray.png",
    frames: ${CELLS.length},
    frameWidth: ${GRID_W},
    frameHeight: ${GRID_H},
    box: ${box(XRAY_BOX)},
    frame0: "data:image/png;base64,${frame0.toString("base64")}",
  },
} as const;
`,
  );
  console.log(`head ${box(head)}  →  ${relative(ROOT, PORTRAIT_TS)} ${statSync(PORTRAIT_TS).size} B`);

  const phone = colour.sizes.get(`${WIDTHS[1]}.avif`) ?? 0;
  const desktop = colour.sizes.get(`${WIDTHS[2]}.avif`) ?? 0;
  if (phone > BUDGET.phoneAvif) throw new Error(`The ${WIDTHS[1]}w AVIF is ${phone} B, over ${BUDGET.phoneAvif} B`);
  if (desktop > BUDGET.desktopAvif) throw new Error(`The ${WIDTHS[2]}w AVIF is ${desktop} B, over ${BUDGET.desktopAvif} B`);
  if (xray.length > BUDGET.xray) throw new Error(`The x-ray strip is ${xray.length} B, over ${BUDGET.xray} B`);
}

await main();
