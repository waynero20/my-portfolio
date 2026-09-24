/**
 * Bakes the hero's dissolve.   npm run assets:dissolve   (after npm run assets:portrait)
 *
 * Wayne's black tee breaks down into the x-ray's own 1-bit bone dots (W23): fine near the shoulders,
 * coarser and sparser further down, scattering into the dark like a render that hasn't finished its
 * bottom rows. No glow, no white light. Every length is in face.png source px ("u"), and every dot sits
 * on the x-ray's lattice (origin XRAY_BOX's corner; cells of 8, 12, 16 and 24 u, which all divide its
 * 96 u blocks), so when the x-ray fires, its dots run straight into these. The colour photo's matching
 * drop-out is baked by build-portrait.mts (scripts/lib/portrait.mts DISSOLVE, dropOut).
 *
 * Outputs (public/hero/, boxes in scripts/lib/portrait.mts DISSOLVE_LAYERS, metadata in
 * src/lib/generated/dissolve.ts):
 * - dissolve-body.png  1 px per u, in front of the photo, riding the bust: the chest dissolving into
 *                      dots, fine (8 u) at the render front, coarser (12, 16 u) and sparser with depth,
 *                      lit along the shoulder line and the arms (the rim), continuing below the cut
 *                      along the extrapolated shoulders.
 * - dissolve-near.png  ½ px per u (its dots are whole px there), in front of the bust, under RONDINA:
 *                      loose 12 u dots in the trail. On scroll they rise faster than the bust, so the
 *                      dots gather into him.
 * - dissolve-far.png   ½ px per u, behind the bust: a wide, sparse, dim bank of small dots, the scatter
 *                      the render gathers from. On scroll it lags.
 * - dissolve-{near,far}-glint.png  the loose layers' glints (W24): two frames stacked vertically, each
 *                      the layer's box, holding a share of its dots (brighter) plus a few ghosts that
 *                      aren't in the layer at all. hero.css fades the two frames in and out on their
 *                      own clocks, so the scatter shimmers.
 * Deterministic: the scatter is a hash of the lattice cell, so a re-run writes the same pixels.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import sharp from "sharp";
import { bayerThreshold } from "../lib/dither.mts";
import { ROOT, fromRoot } from "../lib/paths.mts";
import { CHIN_LINE, DISSOLVE_LAYERS, SOURCE, XRAY_BOX, dissolveDepth, latticeX, latticeY } from "../lib/portrait.mts";
import type { Box, DissolveLayerName } from "../lib/portrait.mts";

const SOURCE_FILE = fromRoot("public/hero/face.png");
const DISSOLVE_TS = fromRoot("src/lib/generated/dissolve.ts");

/** All the dissolve's PNGs together must stay under this (they are 16-colour palette PNGs). */
const BUDGET_BYTES = 16_000;

/** Each layer's px per u. The loose layers' dots and cells are even in u, so they stay whole at ½. */
const SCALE: Record<DissolveLayerName, number> = { body: 1, near: 0.5, far: 0.5 };

const W = SOURCE.width;
const H = SOURCE.height;

const BONE = [237, 233, 227] as const;
const TUNGSTEN = [255, 180, 92] as const;

const LOOK = {
  /** The body layer: the tee's interior density, the rim's extra density and the rim's blur radius (u). */
  bodyBase: 0.34,
  bodyRim: 0.85,
  rimSigma: 26,
  /** The body's alpha at the render front and at the end of the trail. */
  bodyAlpha: [0.5, 0.2],
  /** How fast the body's density decays down the trail (an exponent on the remaining depth). */
  bodyDecay: 1.2,
  /** Share of a hash mixed into the Bayer threshold (breaks the pegboard lattice at low density). */
  jitter: 0.15,
  /** Warmth (share of tungsten) at the front: the lamp still catches the top of the rim. */
  warm: 0.28,
  /** A dot's side as a share of its cell (the rest is the gap). */
  dot: 0.72,
  farDensity: 0.24,
  farAlpha: 0.32,
  nearDensity: 0.34,
  nearAlpha: 0.4,
  /** The loose layers' glints: the share of their dots that twinkle, the ghosts' extra density, and the glints' alpha boost. */
  glintShare: 0.3,
  glintGhosts: 0.5,
  glintBoost: 1.45,
} as const;

/** Brighter than this is skin, not the tee. */
const TEE_MAX_LUMA = 0.28;
/** The tee's luma percentiles that map to no fold and a full fold (about 0.1 and 0.22 on the original photo). */
const FOLD_RANGE = [0.2, 0.93] as const;

/** The body layer's cell sizes (u), fine to coarse, and the lattice block each cell size is chosen per. */
const BODY_CELLS = [8, 12, 16] as const;
const BODY_BLOCK = 48;

type Rgb = readonly [number, number, number];

interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
}

/** A layer's pixels: its box in u, stored at `scale` px per u (width × height px, `frames` stacked vertically). */
interface Layer extends Box {
  scale: number;
  width: number;
  height: number;
  frames: number;
  data: Uint8Array;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Rounds to `steps` levels (keeps the palette PNG tiny and the look 1-bit-ish). */
const quantise = (v: number, steps: number): number => Math.round(v * steps) / steps;

/** Bone with `warm` of tungsten mixed in. */
const tint = (warm: number): Rgb => [mix(BONE[0], TUNGSTEN[0], warm), mix(BONE[1], TUNGSTEN[1], warm), mix(BONE[2], TUNGSTEN[2], warm)];

/** A stable hash in [0, 1) per lattice cell (and salt). */
function hash(x: number, y: number, salt: number): number {
  let n = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** The ordered threshold with a share `jitter` of the cell's hash mixed in. */
const threshold = (ix: number, iy: number, cell: number, jitter: number): number =>
  (1 - jitter) * bayerThreshold(ix, iy) + jitter * hash(ix, iy, cell);

/** The silhouette's horizontal span below the photo's cut (u): the shoulders extrapolated outwards. */
function spanBelow(y: number): [number, number] {
  const d = Math.max(0, y - H);
  return [9 - 0.28 * d, 987 + 0.28 * d];
}

async function readRgba(file: string): Promise<RawImage> {
  const { data, info } = await sharp(file).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

function newLayer(box: Box, scale = 1, frames = 1): Layer {
  const width = box.w * scale;
  const height = box.h * scale;
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error(`A ${box.w}×${box.h} u box isn't whole px at ${scale} px per u`);
  return { ...box, scale, width, height, frames, data: new Uint8Array(width * height * frames * 4) };
}

/** Paints one square dot, `size` u on a side, with its top-left at (left, top) u, into `frame`. */
function paintDot(layer: Layer, left: number, top: number, size: number, rgb: Rgb, alpha: number, frame = 0): void {
  const a = Math.round(clamp01(alpha) * 255);
  const x0 = (left - layer.x) * layer.scale;
  const y0 = (top - layer.y) * layer.scale;
  const side = size * layer.scale;
  if (!Number.isInteger(x0) || !Number.isInteger(y0) || !Number.isInteger(side)) {
    throw new Error(`A ${size} u dot at (${left}, ${top}) u isn't whole px at ${layer.scale} px per u`);
  }
  for (let y = 0; y < side; y++) {
    const py = y0 + y;
    if (py < 0 || py >= layer.height) continue;
    for (let x = 0; x < side; x++) {
      const px = x0 + x;
      if (px < 0 || px >= layer.width) continue;
      const i = ((frame * layer.height + py) * layer.width + px) * 4;
      layer.data[i] = Math.round(rgb[0]);
      layer.data[i + 1] = Math.round(rgb[1]);
      layer.data[i + 2] = Math.round(rgb[2]);
      layer.data[i + 3] = a;
    }
  }
}

/**
 * Where a loose dot goes: its layer (`base`), one of the two glint frames (0 or 1), or nowhere. A cell
 * whose hash `h` clears the density is a dot; a share of those, picked by a second hash, move to a
 * glint frame. Cells that miss by a little (up to LOOK.glintGhosts more density) are ghosts: glints
 * only, dots that come and go where the layer has none.
 */
function looseDot(density: number, h: number, g: number): "base" | 0 | 1 | null {
  const frame = g < 0.5 ? 0 : 1;
  if (density > h) return g < LOOK.glintShare / 2 || g >= 1 - LOOK.glintShare / 2 ? frame : "base";
  return density * (1 + LOOK.glintGhosts) > h ? frame : null;
}

/** The dot of the cell of side `cell` whose top-left is (cx, cy) u: LOOK.dot of the cell (at least 2 u), centred. */
function cellDot(layer: Layer, cx: number, cy: number, cell: number, rgb: Rgb, alpha: number): void {
  const size = Math.max(2, Math.round(cell * LOOK.dot));
  const inset = Math.round((cell - size) / 2);
  paintDot(layer, cx + inset, cy + inset, size, rgb, alpha);
}

/** Soft "inside the body" at (x, y) u: the photo's own row span above the cut, the extrapolated span below it. */
function insideBody(face: RawImage) {
  const rowSpans = Array.from({ length: H }, (_, y): [number, number] | null => {
    let left = -1;
    let right = -1;
    for (let x = 0; x < W; x++) {
      if (face.data[(y * W + x) * 4 + 3] < 128) continue;
      if (left < 0) left = x;
      right = x;
    }
    return left < 0 ? null : [left, right];
  });
  return (x: number, y: number, feather: number): number => {
    const span = y < H ? rowSpans[Math.max(0, Math.min(H - 1, Math.round(y)))] : spanBelow(y);
    if (!span) return 0;
    const [left, right] = span;
    return smoothstep(left - feather * 0.25, left + feather, x) * (1 - smoothstep(right - feather, right + feather * 0.25, x));
  };
}

/**
 * The tee's folds, 0–1, from the photo's luma, stretched over the tee's own range (its FOLD_RANGE
 * percentiles of the dark pixels below the chin), so a blacker tee still shows its folds. Skin reads as
 * flat, so the neck adds nothing.
 */
function foldsOf(face: RawImage) {
  const lumaAt = (i: number): number => (0.2126 * face.data[i] + 0.7152 * face.data[i + 1] + 0.0722 * face.data[i + 2]) / 255;
  const tee: number[] = [];
  for (let y = CHIN_LINE; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (face.data[i + 3] < 128) continue;
      const l = lumaAt(i);
      if (l <= TEE_MAX_LUMA) tee.push(l);
    }
  }
  if (tee.length === 0) throw new Error("No tee pixels below the chin line");
  tee.sort((a, b) => a - b);
  const [lo, hi] = FOLD_RANGE.map((q) => tee[Math.floor(q * (tee.length - 1))]);
  return (x: number, y: number): number => {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(H - 1, Math.round(y)));
    const i = (yi * W + xi) * 4;
    if (face.data[i + 3] < 128) return 0.3;
    const l = lumaAt(i);
    if (l > TEE_MAX_LUMA) return 0.1;
    return clamp01((l - lo) / (hi - lo));
  };
}

/**
 * The rim, 0–1, on the body layer's canvas: where a point is inside the silhouette but a blurred copy of
 * it has dropped (the shoulder line and the arms' edges, where the lamp still catches the tee).
 */
async function rimOf(face: RawImage, box: Box) {
  const silhouette = new Uint8Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) {
    const uy = y + box.y;
    const [left, right] = spanBelow(uy);
    for (let x = 0; x < box.w; x++) {
      const ux = x + box.x;
      const on = uy < H ? ux >= 0 && ux < W && face.data[(uy * W + ux) * 4 + 3] >= 128 : ux >= left && ux <= right;
      silhouette[y * box.w + x] = on ? 255 : 0;
    }
  }
  const blurred = new Uint8Array(
    await sharp(Buffer.from(silhouette), { raw: { width: box.w, height: box.h, channels: 1 } })
      .blur(LOOK.rimSigma)
      .extractChannel(0)
      .raw()
      .toBuffer(),
  );
  if (blurred.length !== silhouette.length) throw new Error(`The rim blur returned ${blurred.length} bytes, expected ${silhouette.length}`);
  return (ux: number, uy: number): number => {
    const x = Math.round(ux - box.x);
    const y = Math.round(uy - box.y);
    if (x < 0 || y < 0 || x >= box.w || y >= box.h) return 0;
    const b = blurred[y * box.w + x] / 255;
    return smoothstep(0.3, 0.5, b) * (1 - smoothstep(0.62, 0.95, b));
  };
}

/**
 * The body layer. The lattice is cut into 48 u blocks; each picks its cell (8, 12 or 16 u) from its
 * depth, dithered, so the resolution steps down with depth like the x-ray's coarse-to-fine frames laid
 * out in space. Density ramps in at the front and decays down the trail; the scatter loosens with depth.
 */
async function bakeBody(face: RawImage): Promise<Layer> {
  const layer = newLayer(DISSOLVE_LAYERS.body, SCALE.body);
  const inside = insideBody(face);
  const folds = foldsOf(face);
  const rim = await rimOf(face, layer);
  for (let by = layer.y; by < layer.y + layer.h; by += BODY_BLOCK) {
    for (let bx = layer.x; bx < layer.x + layer.w; bx += BODY_BLOCK) {
      const depth = dissolveDepth(bx + BODY_BLOCK / 2, by + BODY_BLOCK / 2);
      const level = depth * 2.7 + (bayerThreshold(latticeX(bx, BODY_BLOCK) + 2, latticeY(by, BODY_BLOCK) + 6) - 0.5) * 1.1;
      const cell = BODY_CELLS[Math.max(0, Math.min(BODY_CELLS.length - 1, Math.floor(level)))];
      for (let cy = by; cy < by + BODY_BLOCK; cy += cell) {
        for (let cx = bx; cx < bx + BODY_BLOCK; cx += cell) {
          const mx = cx + cell / 2;
          const my = cy + cell / 2;
          const t = dissolveDepth(mx, my);
          const ramp = smoothstep(-0.14, 0.3, t);
          const decay = 1 - smoothstep(0.05, 0.95, t);
          const edge = rim(mx, my);
          const fold = my < H ? 0.45 + 1.1 * folds(mx, my) : 0.9;
          const density = ramp * decay ** LOOK.bodyDecay * (LOOK.bodyBase * inside(mx, my, 40) * fold + LOOK.bodyRim * edge);
          const jitter = LOOK.jitter + 0.5 * smoothstep(0.2, 0.8, t);
          if (density <= threshold(latticeX(cx, cell), latticeY(cy, cell), cell, jitter)) continue;
          const tt = clamp01(t);
          const alpha = quantise(mix(LOOK.bodyAlpha[0], LOOK.bodyAlpha[1], smoothstep(0, 1, tt)), 12);
          cellDot(layer, cx, cy, cell, tint(quantise(LOOK.warm * edge * (1 - smoothstep(0, 0.5, tt)), 4)), alpha);
        }
      }
    }
  }
  return layer;
}

/** The near layer: 12 u squares centred in 24 u cells, loose (hashed, not ordered), in the trail's middle band and wider than the body. */
function bakeNear(): [Layer, Layer] {
  const layer = newLayer(DISSOLVE_LAYERS.near, SCALE.near);
  const glint = newLayer(DISSOLVE_LAYERS.near, SCALE.near, 2);
  const cell = 24;
  for (let cy = layer.y; cy < layer.y + layer.h; cy += cell) {
    for (let cx = layer.x; cx < layer.x + layer.w; cx += cell) {
      const mx = cx + cell / 2;
      const my = cy + cell / 2;
      const t = dissolveDepth(mx, my);
      const band = smoothstep(0.12, 0.4, t) * (1 - smoothstep(0.5, 1.0, t));
      const [left, right] = spanBelow(Math.max(H, my));
      const wide = smoothstep(left - 190, left + 60, mx) * (1 - smoothstep(right - 60, right + 190, mx));
      const ix = latticeX(cx, cell);
      const iy = latticeY(cy, cell);
      const place = looseDot(LOOK.nearDensity * band * wide, hash(ix, iy, 7), hash(ix, iy, 107));
      if (place === null) continue;
      const alpha = LOOK.nearAlpha * (1 - 0.45 * clamp01(t));
      if (place === "base") paintDot(layer, cx + 6, cy + 6, 12, tint(0.1), quantise(alpha, 12));
      else paintDot(glint, cx + 6, cy + 6, 12, tint(0.1), quantise(alpha * LOOK.glintBoost, 12), place);
    }
  }
  return [layer, glint];
}

/** The far layer: 6 u squares in 16 u cells, dim and loose, in a wide low bank behind the shoulders. */
function bakeFar(): [Layer, Layer] {
  const layer = newLayer(DISSOLVE_LAYERS.far, SCALE.far);
  const glint = newLayer(DISSOLVE_LAYERS.far, SCALE.far, 2);
  const cell = 16;
  for (let cy = layer.y; cy < layer.y + layer.h; cy += cell) {
    for (let cx = layer.x; cx < layer.x + layer.w; cx += cell) {
      const mx = cx + cell / 2;
      const my = cy + cell / 2;
      const ex = (mx - 530) / 820;
      const ey = (my - 1170) / 300;
      const e = ex * ex + ey * ey;
      const ix = latticeX(cx, cell);
      const iy = latticeY(cy, cell);
      const density = LOOK.farDensity * (1 - smoothstep(0.15, 1, e)) * smoothstep(960, 1080, my);
      const place = looseDot(density, hash(ix, iy, 3), hash(ix, iy, 103));
      if (place === null) continue;
      const alpha = LOOK.farAlpha * (1 - 0.5 * smoothstep(0.3, 1, e));
      if (place === "base") paintDot(layer, cx + 6, cy + 6, 6, tint(0.3), quantise(alpha, 12));
      else paintDot(glint, cx + 6, cy + 6, 6, tint(0.3), quantise(alpha * LOOK.glintBoost, 12), place);
    }
  }
  return [layer, glint];
}

async function writeLayer(file: string, layer: Layer): Promise<number> {
  await sharp(Buffer.from(layer.data), { raw: { width: layer.width, height: layer.height * layer.frames, channels: 4 } })
    .png({ palette: true, colours: 16, dither: 0, compressionLevel: 9, effort: 10 })
    .toFile(fromRoot(`public${file}`));
  const bytes = statSync(fromRoot(`public${file}`)).size;
  console.log(`public${file}  ${layer.width}×${layer.height * layer.frames}  ${bytes} B`);
  return bytes;
}

const box = ({ x, y, w, h }: Box): string => `{ x: ${x}, y: ${y}, w: ${w}, h: ${h} }`;

async function main(): Promise<void> {
  if (!existsSync(SOURCE_FILE)) throw new Error(`${relative(ROOT, SOURCE_FILE)} is missing`);
  const face = await readRgba(SOURCE_FILE);
  if (face.width !== W || face.height !== H) {
    throw new Error(`face.png is ${face.width}×${face.height}; scripts/lib/portrait.mts expects ${W}×${H}`);
  }
  for (const [name, layerBox] of Object.entries(DISSOLVE_LAYERS)) {
    if ((layerBox.x - XRAY_BOX.x) % 96 !== 0 || (layerBox.y - XRAY_BOX.y) % 96 !== 0) throw new Error(`The ${name} layer is off the x-ray's 96 u lattice`);
  }
  mkdirSync(fromRoot("public/hero"), { recursive: true });

  const [near, nearGlint] = bakeNear();
  const [far, farGlint] = bakeFar();
  const layers: [DissolveLayerName, Layer, Layer | null][] = [
    ["far", far, farGlint],
    ["body", await bakeBody(face), null],
    ["near", near, nearGlint],
  ];
  let total = 0;
  const entries: string[] = [];
  for (const [name, layer, glint] of layers) {
    const src = `/hero/dissolve-${name}.png`;
    total += await writeLayer(src, layer);
    let glintEntry = "";
    if (glint) {
      const glintSrc = `/hero/dissolve-${name}-glint.png`;
      total += await writeLayer(glintSrc, glint);
      glintEntry = `, glint: "${glintSrc}"`;
    }
    entries.push(`  ${name}: { src: "${src}", width: ${layer.width}, height: ${layer.height}, box: ${box(layer)}${glintEntry} },`);
  }
  console.log(`dissolve total ${total} B`);
  if (total > BUDGET_BYTES) throw new Error(`The dissolve layers are ${total} B, over ${BUDGET_BYTES} B`);

  mkdirSync(dirname(DISSOLVE_TS), { recursive: true });
  writeFileSync(
    DISSOLVE_TS,
    `// Generated by scripts/assets/build-dissolve.mts (npm run assets:dissolve). Do not edit.

/**
 * The hero's dissolve: the chest's dot layers, on the x-ray's lattice. Each box is in source px of
 * public/hero/face.png ("u", like PORTRAIT's); the image is width × height px over it. far sits behind
 * the bust, body rides the bust over the photo, near sits in front of it (under RONDINA). A glint is a
 * sprite of two frames stacked vertically, each the layer's box: dots that fade in and out.
 */
export const DISSOLVE = {
${entries.join("\n")}
} as const;
`,
  );
  console.log(`→ ${relative(ROOT, DISSOLVE_TS)}`);
}

await main();
