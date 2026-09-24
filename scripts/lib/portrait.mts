/**
 * The hero portrait's composition and pure maths: the photo (public/hero/face.png) is the unit of the
 * whole bust rig. Every length here is in source px of that photo ("u"). hero.css scales u to CSS px
 * with --s (the head's CSS height over HEAD.h), so the photo, its x-ray and the dissolve's dot layers
 * can never drift apart. build-portrait.mts writes these numbers into src/lib/generated/portrait.ts, and
 * build-dissolve.mts bakes the dot layers at exactly these boxes (src/lib/generated/dissolve.ts).
 */
import { bayerThreshold } from "./dither.mts";

const OPAQUE = 128;

/** The photo: 992×1057, a cutout of head, neck and black tee, cut flat at its last row. */
export const SOURCE = { width: 992, height: 1057 } as const;

/**
 * The photo's chin line, in u. A silhouette can't show where the front of a chin is (the jaw merges
 * into the neck), so it is set by eye: just under the chin, where the neck shadow starts. The head box
 * (crown to this line) is what the layout calls --m; RONDINA's cap line sits 3% of it lower still.
 * assertChinInNeck checks it lies between the jaw tuck and the shoulders.
 */
export const CHIN_LINE = 765;

/**
 * The x-ray's bottom dissolves before the flat cut: its cells drop out (dithered) as the keep factor
 * ramps to 0 from FADE.from to FADE.to (as fractions of the height), rising by FADE.sides towards the
 * left and right edges, so the shoulders go first and the cut can never show. It reaches a little lower
 * than the colour photo's drop-out (DISSOLVE), so an exposure renders a few more rows of the chest.
 */
export const FADE = { from: 0.905, to: 0.99, sides: 0.07 } as const;

/**
 * A soft shade over the neck, as a chin shadow under the overhead lamp would fall: RONDINA's cap line
 * runs across the neck, and bone type over lit skin (luminance up to .58) can't hold 3:1. The colour
 * photo is darkened by up to `strength` from just under the chin down to the collar, feathered at every
 * edge. The x-ray is dithered from the unshaded photo.
 */
export const NECK_SHADE = { cx: 492, halfWidth: [110, 190], rows: [748, 800, 880, 935], strength: 0.34 } as const;

/**
 * The x-ray box: the bust from just above the crown down to the cut, padded to whole coarse cells (96 u,
 * the least common multiple of the x-ray's cells). Its top-left corner is the origin of every dot lattice
 * in the rig (the x-ray's frames, the photo's drop-out and the dissolve's layers), so when the x-ray
 * fires, its dots and the dissolve's line up.
 */
export const XRAY_BOX = { x: -32, y: SOURCE.height - 864, w: 1056, h: 864 } as const;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The dissolve (Wayne's W23): the black tee breaks down into the x-ray's own bone dots, like a render
 * that hasn't finished its bottom rows. The render front crosses the chest at row `front` on the centre
 * line and up to `sides` higher at the photo's edges (the shoulders go first). Below it the colour photo
 * drops out over `photoRun` (dropOut), gone well above the flat cut, and the dots run on for `trail`
 * (build-dissolve.mts).
 */
export const DISSOLVE = { front: 872, photoRun: 118, sides: 96, trail: 440 } as const;

/** The photo's drop-out cell (u): the x-ray's finest. */
export const PHOTO_CELL = 4;

/**
 * The dot layers' boxes (u, from the photo's corner; every edge on the 96 u lattice). far: a wide, dim
 * bank behind the bust. body: the chest dissolving, riding the bust over the photo. near: loose dots in
 * front of the bust, under RONDINA, a little wider than the body.
 */
export const DISSOLVE_LAYERS = {
  far: { x: -512, y: 673, w: 2016, h: 864 },
  body: { x: -224, y: 769, w: 1440, h: 672 },
  near: { x: -320, y: 769, w: 1632, h: 672 },
} as const satisfies Record<string, Box>;

export type DissolveLayerName = keyof typeof DISSOLVE_LAYERS;

/** Width of the opaque span (first to last pixel with alpha ≥ 128) of every row; 0 for an empty row. */
export function widthProfile(rgba: Uint8Array, width: number, height: number): number[] {
  return Array.from({ length: height }, (_, y) => {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < OPAQUE) continue;
      if (left < 0) left = x;
      right = x;
    }
    return left < 0 ? 0 : right - left + 1;
  });
}

/** Horizontal extent (leftmost to rightmost opaque pixel) across rows `from` to `to`, inclusive. */
export function spanBetween(rgba: Uint8Array, width: number, height: number, from: number, to: number): { left: number; width: number } {
  let left = width;
  let right = -1;
  for (let y = Math.max(0, from); y <= Math.min(height - 1, to); y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < OPAQUE) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (right < 0) throw new Error(`Rows ${from}–${to} hold no opaque pixels`);
  return { left, width: right - left + 1 };
}

/** A row counts as the jaw tuck once it is this much narrower than the head's widest row above it. */
const JAW_TUCK = 0.9;
/** A row counts as the shoulders once it is this much wider than the narrowest neck row above it. */
const SHOULDER_FLARE = 1.2;

/** The jaw search starts once a row is this wide a share of the head's widest (past loose hair at the crown). */
const HEAD_FILLED = 0.6;

/**
 * Checks a hand-set chin line is plausible: at or below the head's last full-width row (the jaw tuck)
 * and above the shoulder flare. Throws otherwise.
 */
export function assertChinInNeck(profile: readonly number[], chinRow: number): void {
  const crown = profile.findIndex((w) => w > 0);
  const widest = Math.max(...profile.slice(crown, chinRow + 1));
  const top = profile.findIndex((w, y) => y >= crown && w >= HEAD_FILLED * widest);
  let headMax = 0;
  let jawRow = -1;
  for (let y = top; y < profile.length; y++) {
    if (profile[y] >= headMax) headMax = profile[y];
    else if (profile[y] < JAW_TUCK * headMax) {
      jawRow = y;
      break;
    }
  }
  if (jawRow < 0) throw new Error("No jaw tuck found: is this a head-and-shoulders image?");

  let neckMin = Infinity;
  let flareRow = profile.length;
  for (let y = jawRow; y < profile.length; y++) {
    neckMin = Math.min(neckMin, profile[y]);
    if (profile[y] > SHOULDER_FLARE * neckMin) {
      flareRow = y;
      break;
    }
  }
  if (chinRow < jawRow - 1 || chinRow >= flareRow) {
    throw new Error(`The chin line ${chinRow} is outside the neck band [${jawRow - 1}, ${flareRow}).`);
  }
}

export interface Tone {
  /** Luma percentiles (0–1) of the opaque pixels that map to black and white. */
  lo: number;
  hi: number;
  gamma: number;
  /** Floor added after the stretch, so dark areas still get sparse dots instead of vanishing. */
  lift: number;
}

const luma = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Grey-scales the opaque pixels: a percentile stretch, a gamma curve, then a lifted floor. Alpha is untouched. */
export function toneMap(rgba: Uint8Array, tone: Tone): Uint8Array {
  const levels: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] >= OPAQUE) levels.push(luma(rgba[i], rgba[i + 1], rgba[i + 2]));
  }
  levels.sort((a, b) => a - b);
  const low = levels[Math.floor(levels.length * tone.lo)] ?? 0;
  const high = levels[Math.floor(levels.length * tone.hi)] ?? 255;
  const span = Math.max(1, high - low);

  const out = new Uint8Array(rgba);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < OPAQUE) continue;
    const t = Math.min(1, Math.max(0, (luma(rgba[i], rgba[i + 1], rgba[i + 2]) - low) / span));
    const v = Math.round((tone.lift + (1 - tone.lift) * t ** tone.gamma) * 255);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The bottom fade's keep factor (1 = untouched, 0 = gone) at source pixel (x, y). See FADE. */
export function fadeAt(x: number, y: number, width: number, height: number): number {
  const side = ((2 * x) / width - 1) ** 2;
  const from = (FADE.from - FADE.sides * side) * height;
  const to = (FADE.to - FADE.sides * side) * height;
  return 1 - smoothstep(from, to, y);
}

/** The render front's row at column x (u). */
export const frontAt = (x: number): number => DISSOLVE.front - DISSOLVE.sides * ((2 * x) / SOURCE.width - 1) ** 2;

/** Depth into the dissolve at (x, y): 0 at the render front, 1 at the end of its trail. */
export const dissolveDepth = (x: number, y: number): number => (y - frontAt(x)) / DISSOLVE.trail;

/** The share of the colour photo kept at (x, y): 1 above the front, 0 from `photoRun` below it. */
export const photoKeep = (x: number, y: number): number => 1 - smoothstep(frontAt(x), frontAt(x) + DISSOLVE.photoRun, y);

/** Column and row of the lattice cell (size `cell`, origin XRAY_BOX's corner) that holds u (x, y). */
export const latticeX = (x: number, cell: number): number => Math.floor((x - XRAY_BOX.x) / cell);
export const latticeY = (y: number, cell: number): number => Math.floor((y - XRAY_BOX.y) / cell);

/**
 * Drops the photo's chest out in Bayer cells: a cell goes wholly transparent where photoKeep at its
 * centre is at or under its Bayer threshold, a 1-bit alpha fade on the x-ray's lattice (straight alpha:
 * colour is untouched). `rgba` is the photo at `width` px (any size of it): the cells and the lattice
 * origin scale with it, rounded to whole px, so every size keeps crisp cells (which also encode far
 * smaller than a resampled pattern). At the source size the cells are exactly PHOTO_CELL u.
 */
export function dropOut(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const scale = width / SOURCE.width;
  const cell = Math.max(2, Math.round(PHOTO_CELL * scale));
  const originX = Math.round(XRAY_BOX.x * scale);
  const originY = Math.round(XRAY_BOX.y * scale);
  const out = new Uint8Array(rgba);
  for (let y = 0; y < height; y++) {
    const iy = Math.floor((y - originY) / cell);
    const cy = (originY + (iy + 0.5) * cell) / scale;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4 + 3;
      if (out[i] === 0) continue;
      const ix = Math.floor((x - originX) / cell);
      if (photoKeep((originX + (ix + 0.5) * cell) / scale, cy) <= bayerThreshold(ix, iy)) out[i] = 0;
    }
  }
  return out;
}

/** Darkens the neck (see NECK_SHADE); alpha is untouched. */
export function shadeNeck(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(rgba);
  const [top, full, fadeFrom, bottom] = NECK_SHADE.rows;
  const [inner, outer] = NECK_SHADE.halfWidth;
  for (let y = top; y < Math.min(height, bottom); y++) {
    const band = smoothstep(top, full, y) * (1 - smoothstep(fadeFrom, bottom, y));
    for (let x = 0; x < width; x++) {
      const k = 1 - NECK_SHADE.strength * band * (1 - smoothstep(inner, outer, Math.abs(x - NECK_SHADE.cx)));
      const i = (y * width + x) * 4;
      out[i] = Math.round(rgba[i] * k);
      out[i + 1] = Math.round(rgba[i + 1] * k);
      out[i + 2] = Math.round(rgba[i + 2] * k);
    }
  }
  return out;
}
