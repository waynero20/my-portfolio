/**
 * The hero portrait's composition and pure maths: the photo (public/hero/face.png) is the unit of the
 * whole bust rig. Every length here is in source px of that photo ("u"). hero.css scales u to CSS px
 * with --s (the head's CSS height over HEAD.h), so the photo, its x-ray and the cloud layers can never
 * drift apart. build-portrait.mts writes these numbers into src/lib/generated/portrait.ts, and
 * build-cloud.mts bakes the cloud layers at exactly these sizes.
 */

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
 * The bottom of the photo dissolves before its flat cut: alpha ramps to 0 from FADE.from to FADE.to (as
 * fractions of the height), rising by FADE.sides towards the left and right edges, so the shoulders
 * melt away first and the cut can never show, even where the cloud thins out.
 */
export const FADE = { from: 0.905, to: 0.99, sides: 0.07 } as const;

/**
 * A soft shade over the neck, as a chin shadow under the overhead lamp would fall: RONDINA's cap line
 * runs across the neck, and bone type over lit skin (luminance up to .58) can't hold 3:1. The colour
 * photo is darkened by up to `strength` from just under the chin down to the collar, feathered at every
 * edge. The x-ray is dithered from the unshaded photo.
 */
export const NECK_SHADE = { cx: 492, halfWidth: [110, 190], rows: [748, 800, 880, 935], strength: 0.34 } as const;

export type CloudLayerName = "back" | "front" | "front-sm";

export interface CloudLayer {
  name: CloudLayerName;
  /** The rendered canvas in px: x spans −1…1 across its width, y spans ±canvasHeight/width about its centre. */
  width: number;
  canvasHeight: number;
  /** The rows kept: `height` rows from row `top` (above the crests and below the dissolved belly is empty alpha). */
  top: number;
  height: number;
  /** The canvas over the photo, in u: left edge, width, and where the photo's cut row lands (a fraction of canvasHeight). */
  place: { x: number; w: number; cutAt: number };
}

/**
 * The cloud rig (the art director's pick, "baked volumetric"). back: a wide soft bank that peeks out
 * behind the shoulders (behind the bust). front: the bank the bust floats in; the photo's cut sits in
 * its dense core. front-sm: the phone bake (max-width 1023px), wider and lower, so it reads as a bank at
 * 360–390px and its crests stay under RONDINA.
 */
export const CLOUD_LAYERS: readonly CloudLayer[] = [
  { name: "back", width: 1024, canvasHeight: 448, top: 64, height: 272, place: { x: -272, w: 1607, cutAt: 0.6 } },
  { name: "front", width: 1600, canvasHeight: 560, top: 64, height: 392, place: { x: -140, w: 1330, cutAt: 0.56 } },
  { name: "front-sm", width: 1280, canvasHeight: 512, top: 112, height: 288, place: { x: -254, w: 1500, cutAt: 0.56 } },
];

/** A layer's box over the photo in u: [x, y, w, h]. */
export function cloudBox(layer: CloudLayer): { x: number; y: number; w: number; h: number } {
  const k = layer.place.w / layer.width;
  return {
    x: layer.place.x,
    y: SOURCE.height - (layer.place.cutAt * layer.canvasHeight - layer.top) * k,
    w: layer.place.w,
    h: layer.height * k,
  };
}

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

/**
 * Checks a hand-set chin line is plausible: at or below the head's last full-width row (the jaw tuck)
 * and above the shoulder flare. Throws otherwise.
 */
export function assertChinInNeck(profile: readonly number[], chinRow: number): void {
  const top = profile.findIndex((w) => w > 0);
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

/** Multiplies alpha by the bottom fade (straight alpha: colour is untouched). */
export function applyFade(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(rgba);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4 + 3;
      out[i] = Math.round(rgba[i] * fadeAt(x, y, width, height));
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
