/**
 * Bakes the hero's cloud layers.   npm run assets:cloud   (after assets:portrait; about a minute)
 *
 *   node scripts/assets/build-cloud.mts                    every layer → public/hero/cloud-{back,front,front-sm}.{avif,webp}
 *   node scripts/assets/build-cloud.mts --only front       one layer
 *   node scripts/assets/build-cloud.mts --scale 0.5 --out <dir> --png    a quick look (PNGs too), not for the site
 *
 * Procedural and reproducible (fixed seeds, no stock art). A cumulus envelope (a smooth union of rounded
 * ellipsoid lobes with a soft, flattened base) is displaced outward by billow fBm (|Perlin| octaves:
 * rounded puffs with creases), then ray-marched front to back along the view axis. Each sample is lit
 * by the room's warm tungsten key from above and behind (self-shadowed by a short light march, with a
 * 3-octave multiple-scattering approximation) plus a cool ambient graded by height, so the crowns rim
 * warm and the belly falls into cool slate shadow. The key dims over the part of the bank RONDINA can
 * cross (text contrast), a warm-white crest term lifts the lit billows, the lamp falls off towards both
 * ends, and the belly dissolves over a wandering band (no straight bottom edge). Small alpha islands are
 * removed after the render. Output is straight-alpha RGBA for compositing over the blackout stage.
 *
 * Layer sizes and placement live in scripts/lib/portrait.mts (CLOUD_LAYERS), shared with
 * build-portrait.mts, which writes their boxes into src/lib/generated/portrait.ts. Rows run on every
 * core via worker_threads (this file is also the worker).
 */
import { mkdirSync, statSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { ROOT, fromRoot } from "../lib/paths.mts";
import { CLOUD_LAYERS } from "../lib/portrait.mts";
import type { CloudLayer, CloudLayerName } from "../lib/portrait.mts";

type Vec3 = readonly [number, number, number];
/** [cx, cy, cz, rx, ry, rz] in cloud units (x −1…1 across the canvas, y up, z toward the viewer). */
type Lobe = readonly [number, number, number, number, number, number];

interface Look {
  seed: number;
  /** Displacement noise frequency (per cloud unit), octaves, gain (lower = rounder, sleeker) and lacunarity. */
  freq: number;
  octaves: number;
  gain: number;
  lac: number;
  /** Outward billow displacement, and the bias that makes creases cut in and puffs bulge out. */
  amp: number;
  bias: number;
  /** Edge softness (SDF units) and the lobes' smooth-union radius. */
  soft: number;
  blend: number;
  /** Extinction per unit density per cloud unit. */
  sigma: number;
  /** The flat base's height and softness. */
  baseY: number;
  baseFade: number;
  /** The belly's alpha fade band below and above the base, and how far its edge wanders. */
  bellyDrop: number;
  bellyRise: number;
  bellyWander: number;
  /** Toward the key: above, a touch right, behind. */
  light: Vec3;
  /** Key falloff across the bank, [x from, x to, dim factor at the left]: the crests RONDINA crosses stay dim. */
  keyRamp: readonly [number, number, number];
  /** The belly (this far above the base) gets no direct key. */
  keyMask: number;
  keyHex: string;
  key: number;
  /** The rim colour where the key is dimmed (a desaturated grey, so dim crests don't go brown). */
  dimHex: string;
  msHex: string;
  keyMs: number;
  /** Multiple-scattering octave energy and extinction. */
  msA: number;
  msB: number;
  ambTopHex: string;
  ambBotHex: string;
  amb: number;
  /** Internal density variation. */
  interior: number;
  exposure: number;
  steps: number;
  zSpan: number;
  /** A warm-white highlight on the brightest crests, only where the key is undimmed. */
  crestHex: string;
  crest: number;
  /** The lamp's centre (cloud x) and how much the key falls off towards the ends. */
  lampX: number;
  lampFall: number;
  /** Alpha taper over this fraction of the half-width at both ends (0 = none). */
  taper: number;
  /** Gaussian blur sigma in px after the render (depth of field), 0 = none. */
  blur: number;
  /** Hand retouches, [x, y, radius, strength] in cloud units: the key is darkened there (a stray lit puff). */
  retouch: readonly (readonly [number, number, number, number])[];
}

const FRONT_LOBES: readonly Lobe[] = [
  [-0.04, -0.06, 0.02, 0.44, 0.13, 0.26],
  [0.3, -0.02, -0.02, 0.3, 0.15, 0.26],
  [0.52, 0.04, -0.06, 0.2, 0.13, 0.2],
  [0.7, -0.04, 0.0, 0.2, 0.1, 0.18],
  [-0.4, -0.04, 0.04, 0.3, 0.12, 0.22],
  [-0.14, 0.0, -0.04, 0.22, 0.12, 0.2],
  [-0.7, -0.07, 0.0, 0.24, 0.085, 0.16],
  [0.86, -0.1, 0.0, 0.14, 0.06, 0.14],
];

/** The phone bank: wider and lower, highest right of centre, long thin tails. */
const FRONT_SM_LOBES: readonly Lobe[] = [
  [-0.02, -0.07, 0.02, 0.4, 0.11, 0.26],
  [0.28, -0.03, -0.02, 0.28, 0.13, 0.26],
  [0.5, 0.0, -0.06, 0.2, 0.12, 0.2],
  [0.7, -0.05, 0.0, 0.2, 0.09, 0.18],
  [-0.36, -0.05, 0.04, 0.28, 0.1, 0.22],
  [-0.12, -0.02, -0.04, 0.2, 0.1, 0.2],
  [-0.66, -0.08, 0.0, 0.22, 0.075, 0.16],
  [0.86, -0.1, 0.0, 0.14, 0.06, 0.14],
];

const BACK_LOBES: readonly Lobe[] = [
  [0.0, -0.05, 0.0, 0.46, 0.17, 0.3],
  [0.42, 0.04, -0.05, 0.3, 0.19, 0.3],
  [0.64, 0.1, -0.1, 0.17, 0.12, 0.2],
  [-0.42, 0.02, 0.0, 0.3, 0.17, 0.28],
  [-0.64, 0.1, -0.06, 0.16, 0.12, 0.2],
  [-0.8, -0.07, 0.0, 0.2, 0.08, 0.16],
  [0.84, -0.05, 0.0, 0.16, 0.08, 0.16],
];

/** "Tungsten crown": the lamp overhead, warm lit crowns, strong self-shadow, a cool dark belly. */
const BASE: Look = {
  seed: 7,
  freq: 3.1,
  octaves: 5,
  gain: 0.44,
  lac: 2.07,
  amp: 0.1,
  bias: 0.35,
  soft: 0.05,
  blend: 0.14,
  sigma: 55,
  baseY: -0.17,
  baseFade: 0.1,
  bellyDrop: 0.09,
  bellyRise: 0.09,
  bellyWander: 0.12,
  light: [0.2, 0.72, -0.66],
  // keyRamp[0] .18 → .21 keeps the backdrop behind RONDINA under 0.24 mid-scroll.
  keyRamp: [0.21, 0.62, 0.27],
  keyMask: 0.08,
  keyHex: "#FFCB94",
  key: 1.35,
  dimHex: "#FFCB94",
  msHex: "#AFB2B8",
  keyMs: 0.2,
  msA: 0.35,
  msB: 0.7,
  ambTopHex: "#5A6880",
  ambBotHex: "#1A2230",
  amb: 0.3,
  interior: 0.3,
  exposure: 1,
  steps: 64,
  zSpan: 0.42,
  crestHex: "#FFE3C4",
  crest: 0.35,
  lampX: 0.45,
  lampFall: 0.25,
  taper: 0.12,
  blur: 0,
  // A small puff lit alone in the shadowed belly, left of centre, reads as a lump: sink it into the shadow.
  retouch: [[-0.118, -0.028, 0.03, 0.9]],
};

const LOOKS: Record<CloudLayerName, { look: Look; lobes: readonly Lobe[] }> = {
  front: { look: BASE, lobes: FRONT_LOBES },
  // Phones: RONDINA is centred above the bank, not across it, so the key dims far less and the dim crests
  // go silver-grey rather than brown; a shorter belly and a stronger end taper keep it from reading as a band.
  "front-sm": {
    look: {
      ...BASE,
      keyRamp: [-0.3, 0.45, 0.62],
      dimHex: "#E3D3C2",
      bellyDrop: 0.06,
      bellyRise: 0.06,
      ambBotHex: "#232A36",
      lampX: 0.35,
      lampFall: 0.3,
      taper: 0.3,
      retouch: [],
    },
    lobes: FRONT_SM_LOBES,
  },
  // Dimmer, cooler and softer (atmospheric perspective), then blurred (depth of field).
  back: {
    look: {
      ...BASE,
      seed: 23,
      key: 0.55,
      keyMs: 0.1,
      amb: 0.12,
      sigma: 26,
      soft: 0.07,
      baseY: -0.13,
      crest: 0,
      taper: 0.18,
      blur: 2.2,
      retouch: [],
    },
    lobes: BACK_LOBES,
  },
};

/* ------------------------------------------------------------------ noise */

type Noise3 = (x: number, y: number, z: number) => number;

function makePerlin(seed: number): Noise3 {
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = (): number => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash: number, x: number, y: number, z: number): number => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  const lerp = (t: number, a: number, b: number): number => a + t * (b - a);
  return (xIn, yIn, zIn) => {
    const fx = Math.floor(xIn);
    const fy = Math.floor(yIn);
    const fz = Math.floor(zIn);
    const X = fx & 255;
    const Y = fy & 255;
    const Z = fz & 255;
    const x = xIn - fx;
    const y = yIn - fy;
    const z = zIn - fz;
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    return lerp(
      w,
      lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)),
      ),
    );
  };
}

/** A fixed rotation between octaves hides the lattice. */
const ROT = [
  [0.0, 0.8, 0.6],
  [-0.8, 0.36, -0.48],
  [-0.6, -0.48, 0.64],
] as const;

/** Billow fBm: a sum of |noise|, so rounded bumps separated by creases (cauliflower cumulus). Range ~[0, 1]. */
function billow(noise: Noise3, xIn: number, yIn: number, zIn: number, octaves: number, gain: number, lac: number): number {
  let x = xIn;
  let y = yIn;
  let z = zIn;
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * Math.abs(noise(x, y, z));
    norm += amp;
    const nx = ROT[0][0] * x + ROT[0][1] * y + ROT[0][2] * z;
    const ny = ROT[1][0] * x + ROT[1][1] * y + ROT[1][2] * z;
    const nz = ROT[2][0] * x + ROT[2][1] * y + ROT[2][2] * z;
    x = nx * lac + 1.7;
    y = ny * lac + 9.2;
    z = nz * lac + 4.1;
    amp *= gain;
  }
  return (sum / norm) * 1.9;
}

function fbm(noise: Noise3, xIn: number, yIn: number, zIn: number, octaves: number): number {
  let x = xIn;
  let y = yIn;
  let z = zIn;
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x, y, z);
    const nx = ROT[0][0] * x + ROT[0][1] * y + ROT[0][2] * z;
    const ny = ROT[1][0] * x + ROT[1][1] * y + ROT[1][2] * z;
    const nz = ROT[2][0] * x + ROT[2][1] * y + ROT[2][2] * z;
    x = nx * 2.03 + 3.3;
    y = ny * 2.03 + 1.1;
    z = nz * 2.03 + 7.7;
    amp *= 0.5;
  }
  return sum;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Polynomial smooth min: merges lobes with a soft fillet. */
const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

const srgbToLin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexLin = (hex: string): [number, number, number] => [
  srgbToLin(parseInt(hex.slice(1, 3), 16) / 255),
  srgbToLin(parseInt(hex.slice(3, 5), 16) / 255),
  srgbToLin(parseInt(hex.slice(5, 7), 16) / 255),
];

/* ------------------------------------------------------------------ renderer (runs in the workers) */

interface Job {
  look: Look;
  lobes: readonly Lobe[];
  width: number;
  canvasHeight: number;
  /** Canvas rows y0…y1 (end exclusive). */
  y0: number;
  y1: number;
}

/** Ray-marches rows y0…y1 of the canvas into linear premultiplied RGBA floats. */
function renderRows({ look, lobes, width, canvasHeight, y0, y1 }: Job): Float32Array<ArrayBuffer> {
  const noise = makePerlin(look.seed);
  const noise2 = makePerlin(look.seed * 7 + 3);
  const lightLen = Math.hypot(...look.light);
  const L: Vec3 = [look.light[0] / lightLen, look.light[1] / lightLen, look.light[2] / lightLen];
  const scale = (hex: string, k: number): [number, number, number] => {
    const [r, g, b] = hexLin(hex);
    return [r * k, g * k, b * k];
  };
  const key = scale(look.keyHex, look.key);
  const dim = scale(look.dimHex, look.key);
  const keyMs = scale(look.msHex, look.keyMs);
  const ambTop = scale(look.ambTopHex, look.amb);
  const ambBot = scale(look.ambBotHex, look.amb);
  const crest = scale(look.crestHex, look.crest);
  const yHalf = canvasHeight / width;
  const off = [look.seed * 1.37, look.seed * 0.71, look.seed * 2.13] as const;

  /** Henyey–Greenstein phase for the angle between the light's travel (−L) and the view ray (+z). */
  const hg = (g: number, c: number): number => (1 - g * g) / (4 * Math.PI * (1 + g * g - 2 * g * c) ** 1.5);
  const cosT = -L[2];

  /** Signed distance to the smooth union of the lobes (a normalised ellipsoid approximation). */
  const envelope = (x: number, y: number, z: number): number => {
    let d = 1e9;
    for (let i = 0; i < lobes.length; i++) {
      const [cx, cy, cz, rx, ry, rz] = lobes[i];
      const k = Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz);
      const di = (k - 1) * Math.min(rx, ry, rz);
      d = i === 0 ? di : smin(d, di, look.blend);
    }
    return d;
  };

  const density = (x: number, y: number, z: number, octaves: number): number => {
    const d = envelope(x, y, z);
    if (d > look.amp * (1.9 - look.bias) + look.soft) return 0;
    const base = smoothstep(look.baseY - look.baseFade, look.baseY + look.baseFade, y);
    if (base <= 0) return 0;
    const b = billow(noise, x * look.freq + off[0], y * look.freq + off[1], z * look.freq + off[2], octaves, look.gain, look.lac);
    // Puffs bulge outward; the underside is flattened (less displacement near the base).
    const lift = smoothstep(look.baseY - 0.02, look.baseY + 0.18, y);
    const dd = d - look.amp * (b - look.bias) * (0.35 + 0.65 * lift);
    if (dd > 0) return 0;
    let dens = smoothstep(0, look.soft, -dd) * base;
    if (octaves > 3 && look.interior > 0) {
      const n = fbm(noise2, x * 5 + 1, y * 5 + 2, z * 5 + 3, 3);
      dens *= 1 - look.interior + look.interior * (0.5 + n) * 1.4;
    }
    return Math.max(0, dens);
  };

  const LIGHT_STEPS = [0.018, 0.028, 0.045, 0.07, 0.11, 0.17];
  const out = new Float32Array((y1 - y0) * width * 4);
  const dz = (2 * look.zSpan) / look.steps;
  const keyMaskY = look.baseY + look.keyMask;

  for (let py = y0; py < y1; py++) {
    const y = yHalf - ((py + 0.5) / canvasHeight) * 2 * yHalf;
    for (let px = 0; px < width; px++) {
      const x = ((px + 0.5) / width) * 2 - 1;
      // The key's falloff across the bank (text contrast), and the lamp's falloff towards the ends.
      const kr = look.keyRamp[2] + (1 - look.keyRamp[2]) * smoothstep(look.keyRamp[0], look.keyRamp[1], x);
      let patch = 1;
      for (const [rx, ry, radius, strength] of look.retouch) {
        patch *= 1 - strength * Math.exp(-((x - rx) ** 2 + (y - ry) ** 2) / (radius * radius));
      }
      const lamp = (1 - look.lampFall * smoothstep(0.25, 1.1, Math.abs(x - look.lampX))) * patch;
      const tint = smoothstep(look.keyRamp[2], 1, kr);
      const rimR = (dim[0] + (key[0] - dim[0]) * tint) * lamp;
      const rimG = (dim[1] + (key[1] - dim[1]) * tint) * lamp;
      const rimB = (dim[2] + (key[2] - dim[2]) * tint) * lamp;
      const crestW = look.crest * smoothstep(0.85, 1, kr) * lamp;

      let T = 1;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      // Jitter the march start to hide slicing.
      const jitter = (((Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1) + 1) % 1;
      for (let s = 0; s < look.steps; s++) {
        const z = look.zSpan - (s + jitter) * dz;
        const dns = density(x, y, z, look.octaves);
        if (dns <= 0.001) continue;
        // Light march toward the key.
        let od = 0;
        let lx = x;
        let ly = y;
        let lz = z;
        for (const st of LIGHT_STEPS) {
          lx += L[0] * st;
          ly += L[1] * st;
          lz += L[2] * st;
          od += density(lx, ly, lz, 3) * st;
        }
        od *= look.sigma;
        // Multiple scattering (Wrenninge's approximation): 3 octaves.
        let rim = 0;
        let ms = 0;
        let a = 1;
        let bExt = 1;
        let c = 1;
        for (let o = 0; o < 3; o++) {
          const e = a * Math.exp(-od * bExt) * (0.75 * hg(0.55 * c, cosT) + 0.25 * hg(-0.2 * c, cosT)) * 4 * Math.PI;
          if (o === 0) rim = e;
          else ms += e;
          a *= look.msA;
          bExt *= look.msB;
          c *= 0.5;
        }
        // A cool ambient graded by height inside the cloud: the tops see the sky, the belly does not.
        const hgt = smoothstep(look.baseY - 0.04, look.baseY + 0.32, y);
        const ambOcc = 0.4 + 0.6 * Math.exp(-od * 0.25);
        const ar = (ambBot[0] + (ambTop[0] - ambBot[0]) * hgt) * ambOcc;
        const ag = (ambBot[1] + (ambTop[1] - ambBot[1]) * hgt) * ambOcc;
        const ab = (ambBot[2] + (ambTop[2] - ambBot[2]) * hgt) * ambOcc;
        // The lamp is above the deck: the belly never sees it directly (the underside stays cool and dark).
        const km = smoothstep(keyMaskY, keyMaskY + 0.16, y);
        rim *= km;
        ms *= 0.35 + 0.65 * km;
        const keyRim = rim * kr;
        ms *= (0.5 + 0.5 * kr) * patch;
        const hi = crestW * keyRim * keyRim;
        const sr = rimR * keyRim + keyMs[0] * ms + ar + crest[0] * hi;
        const sg = rimG * keyRim + keyMs[1] * ms + ag + crest[1] * hi;
        const sb = rimB * keyRim + keyMs[2] * ms + ab + crest[2] * hi;
        const tr = Math.exp(-look.sigma * dns * dz);
        const wgt = T * (1 - tr); // energy-conserving slab integral
        cr += wgt * sr;
        cg += wgt * sg;
        cb += wgt * sb;
        T *= tr;
        if (T < 0.004) break;
      }
      // The belly dissolves over a band whose edge wanders (no straight bottom line), and the ends taper.
      const wander = look.bellyWander * fbm(noise2, x * 2.2 + 11, 0.5, 3.7, 3);
      const bw = smoothstep(look.baseY - look.bellyDrop + wander, look.baseY + look.bellyRise + wander, y);
      const taper = look.taper > 0 ? smoothstep(1, 1 - look.taper, Math.abs(x)) : 1;
      const fade = bw * Math.sqrt(bw) * taper;
      const i = ((py - y0) * width + px) * 4;
      out[i] = cr * fade;
      out[i + 1] = cg * fade;
      out[i + 2] = cb * fade;
      out[i + 3] = (1 - T) * fade;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ post */

/**
 * A filmic shoulder, then sRGB, then alpha divided out (straight alpha over the near-black stage). Alpha
 * is raised to the brightest channel so thin glowing rims aren't clipped; a ±0.5 LSB dither keeps the
 * dark gradients from banding.
 */
function toRgba(buf: Float32Array, width: number, height: number, exposure: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const byte = (v: number): number => Math.min(255, Math.max(0, Math.round(v)));
  for (let p = 0, i = 0; p < width * height; p++, i += 4) {
    const r = linToSrgb(1 - Math.exp(-buf[i] * exposure));
    const g = linToSrgb(1 - Math.exp(-buf[i + 1] * exposure));
    const b = linToSrgb(1 - Math.exp(-buf[i + 2] * exposure));
    const al = Math.min(1, Math.max(buf[i + 3], r, g, b));
    const d = ((Math.sin(p * 0.7548 + (p % width) * 1.618) * 43758.5453) % 1) * 0.5;
    const div = al > 1e-4 ? 1 / al : 0;
    out[i] = byte(r * div * 255 + d);
    out[i + 1] = byte(g * div * 255 + d);
    out[i + 2] = byte(b * div * 255 + d);
    out[i + 3] = byte(al * 255 + d);
  }
  return out;
}

/**
 * Zeroes every connected component (4-neighbour, alpha above `threshold`) smaller than `minArea` px,
 * feathering its faint halo out over `halo` px: stray wisps and specks that read as dirt, not
 * cloud. Returns how many were removed.
 */
function removeIslands(rgba: Uint8Array, width: number, height: number, threshold: number, minArea: number, halo: number): number {
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const members: number[] = [];
  let removed = 0;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || rgba[start * 4 + 3] <= threshold) continue;
    seen[start] = 1;
    stack.push(start);
    members.length = 0;
    while (stack.length > 0) {
      const p = stack.pop() ?? 0;
      members.push(p);
      const x = p % width;
      const neighbours = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
      for (const n of neighbours) {
        if (n < 0 || n >= width * height || seen[n] || rgba[n * 4 + 3] <= threshold) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (members.length >= minArea) continue;
    // Clear the island, and feather its faint halo to 0 towards it (a hard hole would show once blurred).
    let x0 = width;
    let x1 = 0;
    let y0 = height;
    let y1 = 0;
    for (const p of members) {
      x0 = Math.min(x0, p % width);
      x1 = Math.max(x1, p % width);
      y0 = Math.min(y0, Math.floor(p / width));
      y1 = Math.max(y1, Math.floor(p / width));
    }
    for (let y = Math.max(0, y0 - halo); y <= Math.min(height - 1, y1 + halo); y++) {
      for (let x = Math.max(0, x0 - halo); x <= Math.min(width - 1, x1 + halo); x++) {
        const q = (y * width + x) * 4 + 3;
        if (rgba[q] > threshold) continue;
        let d = Infinity;
        for (const p of members) d = Math.min(d, Math.hypot((p % width) - x, Math.floor(p / width) - y));
        rgba[q] = Math.round(rgba[q] * Math.min(1, d / halo));
      }
    }
    for (const p of members) rgba[p * 4 + 3] = 0;
    removed++;
  }
  return removed;
}

async function render(job: Omit<Job, "y0" | "y1">, top: number, rows: number): Promise<Float32Array> {
  const workers = Math.min(availableParallelism(), 12);
  const band = Math.ceil(rows / workers);
  const parts = await Promise.all(
    Array.from({ length: workers }, (_, i) => ({ y0: top + i * band, y1: top + Math.min(rows, (i + 1) * band) }))
      .filter(({ y0, y1 }) => y0 < y1)
      .map(
        ({ y0, y1 }) =>
          new Promise<{ y0: number; buf: Float32Array }>((resolve, reject) => {
            const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { ...job, y0, y1 } satisfies Job });
            worker.once("message", (buf: Float32Array) => resolve({ y0, buf }));
            worker.once("error", reject);
          }),
      ),
  );
  const all = new Float32Array(job.width * rows * 4);
  for (const { y0, buf } of parts) all.set(buf, (y0 - top) * job.width * 4);
  return all;
}

/** Alpha above 14% counts as cloud; a component smaller than this (at full size) is a speck. */
const ISLAND_ALPHA = 36;
const ISLAND_MIN_PX = 400;
const ISLAND_HALO_PX = 10;
const BUDGET_BYTES = 40_000;

async function bake(layer: CloudLayer, scale: number, outDir: string, png: boolean): Promise<{ avif: number; webp: number }> {
  const { default: sharp } = await import("sharp");
  const { look, lobes } = LOOKS[layer.name];
  const width = Math.round(layer.width * scale);
  const canvasHeight = Math.round(layer.canvasHeight * scale);
  const top = Math.round(layer.top * scale);
  const rows = Math.round(layer.height * scale);
  const t0 = Date.now();
  const buf = await render({ look, lobes, width, canvasHeight }, top, rows);
  const rgba = toRgba(buf, width, rows, look.exposure);
  const islands = removeIslands(rgba, width, rows, ISLAND_ALPHA, Math.max(8, Math.round(ISLAND_MIN_PX * scale * scale)), ISLAND_HALO_PX);

  const raw = { raw: { width, height: rows, channels: 4 as const } };
  let image = sharp(Buffer.from(rgba), raw);
  if (look.blur > 0) image = sharp(await image.blur(look.blur * scale).raw().toBuffer(), raw);

  mkdirSync(outDir, { recursive: true });
  const base = join(outDir, `cloud-${layer.name}`);
  if (png) await image.clone().png().toFile(`${base}.png`);
  await image.clone().avif({ quality: 50, effort: 9, chromaSubsampling: "4:2:0" }).toFile(`${base}.avif`);
  await image.clone().webp({ quality: 62, alphaQuality: 55, effort: 6, smartSubsample: true }).toFile(`${base}.webp`);
  const sizes = { avif: statSync(`${base}.avif`).size, webp: statSync(`${base}.webp`).size };
  console.log(
    `${relative(ROOT, base)}.{avif,webp}  ${width}×${rows}  avif ${sizes.avif} B  webp ${sizes.webp} B  ` +
      `${islands} islands removed  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
  return sizes;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? undefined : args[i + 1];
  };
  const scale = Number(option("scale") ?? 1);
  const only = option("only");
  const outDir = option("out") ?? fromRoot("public/hero");
  const layers = CLOUD_LAYERS.filter((layer) => !only || layer.name === only);
  if (layers.length === 0) throw new Error(`No cloud layer named ${only}`);

  const sizes = new Map<CloudLayerName, { avif: number; webp: number }>();
  for (const layer of layers) sizes.set(layer.name, await bake(layer, scale, outDir, args.includes("--png")));

  // Each device downloads the back layer plus one front layer (phone or desktop).
  const back = sizes.get("back")?.avif;
  const front = Math.max(sizes.get("front")?.avif ?? 0, sizes.get("front-sm")?.avif ?? 0);
  if (scale === 1 && back !== undefined && front > 0) {
    console.log(`per device (AVIF): ${back + front} B of a ${BUDGET_BYTES} B budget`);
    if (back + front > BUDGET_BYTES) throw new Error("The cloud layers are over budget");
  }
}

if (isMainThread) {
  await main();
} else {
  const rows = renderRows(workerData as Job);
  parentPort?.postMessage(rows, [rows.buffer]);
}
