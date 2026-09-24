/** Pure pixel maths for the hero portrait's x-ray: ordered (Bayer) dithering and alpha measurements. */

export type Rgb = readonly [number, number, number];

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function bayerMatrix(size: number): number[][] {
  if (size === 1) return [[0]];
  const half = size / 2;
  const inner = bayerMatrix(half);
  const quadrant = [
    [0, 2],
    [3, 1],
  ];
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => 4 * inner[y % half][x % half] + quadrant[Math.floor(y / half)][Math.floor(x / half)]),
  );
}

/** The 8×8 Bayer matrix, row-major, values 0–63. */
export const BAYER_8: readonly number[] = bayerMatrix(8).flat();

/** The Bayer threshold in (0, 1) for cell (x, y), tiled every 8 cells. */
export const bayerThreshold = (x: number, y: number): number => (BAYER_8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;

/** Rec. 709 luma of an sRGB pixel, 0–1. */
export const luma = (r: number, g: number, b: number): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Averages each factor×factor block into one pixel. Colour is alpha-weighted (transparent pixels don't
 * darken edges); alpha is the plain mean.
 */
export function boxDownsample(rgba: Uint8Array, width: number, height: number, factor: number): Uint8Array {
  if (width % factor !== 0 || height % factor !== 0) {
    throw new Error(`Factor ${factor} must divide the ${width}×${height} image`);
  }
  const outWidth = width / factor;
  const outHeight = height / factor;
  const out = new Uint8Array(outWidth * outHeight * 4);
  for (let by = 0; by < outHeight; by++) {
    for (let bx = 0; bx < outWidth; bx++) {
      const sum = [0, 0, 0];
      let alpha = 0;
      for (let y = by * factor; y < (by + 1) * factor; y++) {
        for (let x = bx * factor; x < (bx + 1) * factor; x++) {
          const i = (y * width + x) * 4;
          const a = rgba[i + 3];
          sum[0] += rgba[i] * a;
          sum[1] += rgba[i + 1] * a;
          sum[2] += rgba[i + 2] * a;
          alpha += a;
        }
      }
      const o = (by * outWidth + bx) * 4;
      if (alpha > 0) out.set([Math.round(sum[0] / alpha), Math.round(sum[1] / alpha), Math.round(sum[2] / alpha)], o);
      out[o + 3] = Math.round(alpha / (factor * factor));
    }
  }
  return out;
}

/** Repeats every pixel into a factor×factor block (pixel-art upscale). */
export function nearestUpscale(rgba: Uint8Array, width: number, height: number, factor: number): Uint8Array {
  const outWidth = width * factor;
  const out = new Uint8Array(outWidth * height * factor * 4);
  for (let y = 0; y < height * factor; y++) {
    for (let x = 0; x < outWidth; x++) {
      const i = (Math.floor(y / factor) * width + Math.floor(x / factor)) * 4;
      out.set(rgba.subarray(i, i + 4), (y * outWidth + x) * 4);
    }
  }
  return out;
}

/** Bounding box of the pixels whose alpha is at least `minAlpha`. */
export function alphaBounds(rgba: Uint8Array, width: number, height: number, minAlpha: number): Bounds {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < minAlpha) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error(`The image is fully transparent below alpha ${minAlpha}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
