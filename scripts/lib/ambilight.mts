/** Pure maths for the baked ambilight tracks (public/ambi/{slug}.json). */

export type Rgb = [number, number, number];

export interface AmbilightTrack {
  v: 1;
  fps: number;
  frames: number;
  /** Left-edge colour per frame, concatenated "rrggbb" hex. */
  l: string;
  /** Right-edge colour per frame, concatenated "rrggbb" hex. */
  r: string;
}

export interface AmbilightGrid {
  width: number;
  height: number;
  fps: number;
  /** Share of the width averaged at each edge (0.08 = the outer 8%). */
  edgeFraction: number;
}

function stripAverage(frame: Uint8Array, width: number, height: number, fromX: number, toX: number): Rgb {
  const sum = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = fromX; x < toX; x++) {
      const i = (y * width + x) * 3;
      sum[0] += frame[i];
      sum[1] += frame[i + 1];
      sum[2] += frame[i + 2];
    }
  }
  const count = height * (toX - fromX);
  return [Math.round(sum[0] / count), Math.round(sum[1] / count), Math.round(sum[2] / count)];
}

/** Average colour of the left and right `edgeFraction` strips of one rgb24 frame (at least one column each). */
export function edgeColours(frame: Uint8Array, width: number, height: number, edgeFraction: number): { left: Rgb; right: Rgb } {
  const columns = Math.max(1, Math.round(width * edgeFraction));
  return {
    left: stripAverage(frame, width, height, 0, columns),
    right: stripAverage(frame, width, height, width - columns, width),
  };
}

const hex = (rgb: Rgb): string => rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("");

/** Packs a raw rgb24 stream of width×height frames into an ambilight track. */
export function ambilightTrack(raw: Uint8Array, grid: AmbilightGrid): AmbilightTrack {
  const frameBytes = grid.width * grid.height * 3;
  if (raw.length % frameBytes !== 0) {
    throw new Error(`Expected a whole number of ${grid.width}×${grid.height} frames, got ${raw.length} bytes`);
  }
  const frames = raw.length / frameBytes;
  if (frames === 0) throw new Error("The stream has no frames");
  let l = "";
  let r = "";
  for (let n = 0; n < frames; n++) {
    const edges = edgeColours(raw.subarray(n * frameBytes, (n + 1) * frameBytes), grid.width, grid.height, grid.edgeFraction);
    l += hex(edges.left);
    r += hex(edges.right);
  }
  return { v: 1, fps: grid.fps, frames, l, r };
}
