/**
 * Builds the Open Graph image (the link preview on Facebook, LinkedIn, X, iMessage, Slack).   npm run assets:og
 *
 * One 1200×630 frame of the Midnight Screening hero: the near-black room lit by one tungsten lamp,
 * Wayne's colour photo (public/hero/face.png) backlit on the right and running off the bottom of the
 * frame (the script refuses a placement that leaves room under the tee), WAYNE / RONDINA in the hero face (src/assets/fonts/gsf-hero.woff2 turned into SVG paths, so the
 * real face is used, not a system font) with RONDINA crossing in front of the tee as it does on the site,
 * and a Fragment Mono slate: the role and city, then the site's host. The lamp's pool breaks into a
 * 1-bit ordered dither at its edge, the site's x-ray language, as a quiet accent.
 *
 * Everything that must survive a crop (Facebook, LinkedIn and iMessage trim the edges differently)
 * sits inside the centred SAFE box, and the type is sized to stay legible as a 600px-wide thumbnail.
 *
 * Outputs public/og-image-v2.jpg under BUDGET_BYTES: mozjpeg with full-resolution chroma (4:4:4), which
 * keeps the skin's gradients and the dither's 1-bit cells clean (a 256-colour PNG bands the ears and
 * lips; a truecolour PNG is over budget). A new filename busts the social networks' caches;
 * src/app/layout.tsx points openGraph and twitter at it. Fragment Mono comes from Google Fonts, so the
 * script needs the network and fails rather than set the slate in another face.
 */
import { readFileSync, statSync } from "node:fs";
import { relative } from "node:path";
import { create } from "fontkit";
import sharp from "sharp";
import { SITE } from "../../src/lib/data.ts";
import { bayerThreshold } from "../lib/dither.mts";
import type { Rgb } from "../lib/dither.mts";
import type { Font } from "fontkit";
import { ROOT, fromRoot } from "../lib/paths.mts";
import { SOURCE, shadeNeck } from "../lib/portrait.mts";

const OUT = fromRoot("public/og-image-v2.jpg");
const FACE_FILE = fromRoot("public/hero/face.png");
const HERO_FONT = fromRoot("src/assets/fonts/gsf-hero.woff2");

const W = 1200;
const H = 630;
/** The box every crop keeps (Facebook and LinkedIn trim up to ~5% per side): 1080×566, centred. */
const SAFE = { x: 60, y: 32, w: 1080, h: 566 } as const;
const BUDGET_BYTES = 350_000;
const JPEG = { quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" } as const;

/** The palette tokens (globals.css) the frame uses. */
const BLACKOUT: Rgb = [0x06, 0x07, 0x08];
const BONE: Rgb = [0xed, 0xe9, 0xe3];
const ASH: Rgb = [0x9a, 0x9d, 0xa4];
const TUNGSTEN: Rgb = [0xff, 0xb4, 0x5c];

/** The name, in the hero face's settings (hero.css): wght 640, wdth 112 (the desktop rest), -0.04em, line-height 0.82. */
const NAME = { size: 178, wght: 640, wdth: 112, tracking: -0.04, leading: 0.82, x: SAFE.x + 4, baseline: 570 } as const;
/** The slate lines: Fragment Mono, uppercase, loosely tracked. */
const SLATE = { size: 22, tracking: 0.06, x: SAFE.x + 6, baselines: [86, 119] } as const;

/**
 * The bust: face.png scaled by `scale`, its head centred on `headX` with the crown at `crownY`. The
 * photo runs at least `overhang` px past the bottom edge, so it never floats; RONDINA's cap line stays
 * below the chin.
 */
const BUST = { scale: 0.73, headX: 910, crownY: 46, overhang: 10 } as const;
/** The photo in u (source px): crown row, chin line (portrait.mts CHIN_LINE), the head's centre and span. */
const FACE = { crown: 242, chin: 765, centre: 492, left: 297, right: 687 } as const;

/**
 * The lamp, behind Wayne and up to his left (our right): a tungsten pool in linear light, falling to
 * blackout before the name. The floor darkens towards the bottom edge, so the tee sinks into the room.
 */
const LAMP = { x: 1005, y: 220, rx: 330, ry: 320, core: 0.1, bloom: 0.012 } as const;
const FLOOR = { from: 0.45, strength: 0.75 } as const;
/**
 * The haze: where the pool thins out, its light breaks into 1-bit HAZE.cell px cells (a Bayer dither,
 * the portrait x-ray's language) over the band of pool values `lo`–`hi`, at most `density` of them lit.
 */
const HAZE = { cell: 4, lo: 0.04, hi: 0.35, density: 0.3, strength: 0.012 } as const;
/**
 * The rim the lamp draws inside the silhouette's edges that face it (crown, hair, ear, neck and shoulder
 * on our right): the alpha blurred by `blur`, so it reads as a soft backlight rather than a drawn line,
 * and looked up `dx`/`dy` px towards the lamp; `strength` in linear light, scaled by the pool there.
 * The lookup reaches past the blur (≈2σ), so edges facing away from the lamp stay unlit.
 */
const RIM = { dx: 3, dy: -3, blur: 2, strength: 0.32 } as const;
/**
 * The cut-out's edge pixels still carry the photo's old light-grey background in their colour (their
 * alpha is right, their RGB is not), which would draw a pale outline round the hair, ears and jaw on
 * the dark room. Every pixel within `band` source px of a see-through one (alpha < `solid`) takes the
 * mean colour of the solid interior (`band` px or more inside the edge) within `reach` px of it.
 */
const DEFRINGE = { solid: 250, band: 3, reach: 5 } as const;

const MODERN_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const linear = (rgb: Rgb): [number, number, number] => [toLinear(rgb[0] / 255), toLinear(rgb[1] / 255), toLinear(rgb[2] / 255)];

// ── Fonts ────────────────────────────────────────────────────────────────────────────────────────────

/** The parts of fontkit's WOFF2 font that its public API does not expose. */
interface GlyfPoint {
  x: number;
  y: number;
  endContour: boolean;
  copy(): GlyfPoint;
}
interface Woff2Internals {
  _transformGlyfTable(): void;
  _transformedGlyphs: ({ numberOfContours: number; points?: GlyfPoint[] } | null | undefined)[];
  _variationProcessor: { transformPoints(gid: number, points: GlyfPoint[]): void } | null;
}

function single(buffer: Buffer, name: string): Font {
  const font = create(buffer);
  if (!("layout" in font)) throw new Error(`${name} is a font collection, expected a single font`);
  return font;
}

/**
 * A WOFF2 variable font at `axes`. fontkit's getVariation() can't re-open a WOFF2, and its WOFF2 glyphs
 * skip gvar, so the coordinates go on the font itself (HVAR then varies the advances) and every outline
 * is moved by gvar here, before any glyph's path is built. Simple glyphs only (the hero subset has no
 * composites).
 */
function variableFont(file: string, axes: Readonly<Record<string, number>>): Font {
  const font = single(readFileSync(file), relative(ROOT, file));
  const coords = Object.entries(font.variationAxes).map(([tag, axis]) => axes[tag] ?? axis?.default ?? 0);
  Object.assign(font, { variationCoords: coords });
  const internals = font as unknown as Woff2Internals;
  internals._transformGlyfTable();
  const processor = internals._variationProcessor;
  if (!processor) throw new Error(`${relative(ROOT, file)} has no variations`);
  internals._transformedGlyphs.forEach((glyph, gid) => {
    if (!glyph || glyph.numberOfContours === 0) return;
    const points = glyph.points;
    if (glyph.numberOfContours < 0 || !points) throw new Error(`${relative(ROOT, file)}: glyph ${gid} is a composite`);
    // gvar also moves the four phantom (metrics) points, each its own contour; they don't touch the outline.
    const phantom = Array.from({ length: 4 }, () => Object.assign(points[0].copy(), { endContour: true }));
    processor.transformPoints(gid, [...points, ...phantom]);
  });
  return font;
}

/** Fetches `url`, failing on any non-2xx status. */
async function download(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response;
}

/**
 * Fragment Mono 400 from the Google Fonts CSS2 API, subset to `text`. No fallback: the slate is the
 * brand's mono face or the build fails, before anything is written.
 */
async function monoFont(text: string): Promise<Font> {
  const glyphs = [...new Set(text)].sort().join("");
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Fragment+Mono&text=${encodeURIComponent(glyphs)}`;
    const css = await (await download(cssUrl, { headers: { "User-Agent": MODERN_UA } })).text();
    const url = /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/.exec(css)?.[1];
    if (!url) throw new Error("no woff2 source in the CSS");
    const font = single(Buffer.from(await (await download(url)).arrayBuffer()), "Fragment Mono");
    const missing = [...glyphs].filter((ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0));
    if (missing.length > 0) throw new Error(`no glyph for ${JSON.stringify(missing.join(""))}`);
    return font;
  } catch (error) {
    throw new Error("Fragment Mono could not be loaded from Google Fonts (the slate needs it; is the network up?)", { cause: error });
  }
}

interface Line {
  d: string;
  width: number;
}

/** A line of text as one SVG path in canvas px, its baseline at `baseline`, tracked by `tracking` em. */
function line(font: Font, text: string, size: number, tracking: number, x: number, baseline: number): Line {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  const track = tracking * font.unitsPerEm;
  let pen = 0;
  const parts: string[] = [];
  run.glyphs.forEach((glyph, i) => {
    const { xAdvance, xOffset, yOffset } = run.positions[i];
    parts.push(glyph.path.transform(k, 0, 0, -k, x + (pen + xOffset) * k, baseline - yOffset * k).toSVG());
    pen += xAdvance + (i < run.glyphs.length - 1 ? track : 0);
  });
  return { d: parts.join(""), width: pen * k };
}

/** Rasterises SVG paths to a W×H coverage mask (0–1). */
async function coverage(paths: readonly string[]): Promise<Float32Array> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  return Float32Array.from(data, (v) => v / 255);
}

// ── Pixels ───────────────────────────────────────────────────────────────────────────────────────────

/** Squared distance from the lamp, in pool radii. */
const lampDistance2 = (x: number, y: number): number => ((x - LAMP.x) / LAMP.rx) ** 2 + ((y - LAMP.y) / LAMP.ry) ** 2;

/** The room in sRGB (0–1, 3 channels): blackout lit by the lamp's pool (linear light) and its dithered haze. */
function room(): Float32Array {
  const out = new Float32Array(W * H * 3);
  const base = linear(BLACKOUT);
  const lamp = linear(TUNGSTEN);
  for (let y = 0; y < H; y++) {
    const floor = 1 - FLOOR.strength * smoothstep(FLOOR.from * H, H, y);
    for (let x = 0; x < W; x++) {
      const d2 = lampDistance2(x, y);
      const pool = Math.exp(-2 * d2);
      const band = smoothstep(HAZE.lo, HAZE.hi, pool);
      const lit = HAZE.density * 4 * band * (1 - band) > bayerThreshold(Math.floor(x / HAZE.cell), Math.floor(y / HAZE.cell));
      const light = (LAMP.core * pool + LAMP.bloom * Math.exp(-0.5 * d2) + (lit ? HAZE.strength : 0)) * floor;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = toSrgb(base[c] + light * lamp[c]);
    }
  }
  return out;
}

interface Placed {
  /** Straight-alpha sRGB colour (0–1) and alpha, W×H. */
  rgb: Float32Array;
  alpha: Float32Array;
  /** The chin line in canvas px. */
  chinY: number;
}

/**
 * The photo (straight-alpha RGBA, w×h) with its edge band recoloured from the solid interior next to it
 * (DEFRINGE); alpha is untouched. The frame's own edges are not silhouette edges: the photo is cut flat.
 */
function defringe(rgba: Uint8Array, w: number, h: number): Uint8Array {
  const { solid, band, reach } = DEFRINGE;
  // The interior: solid pixels with no see-through pixel within `band` px (a square erosion, rows then columns).
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = 1;
      for (let k = Math.max(0, x - band); k <= Math.min(w - 1, x + band) && inside; k++) if (rgba[(y * w + k) * 4 + 3] < solid) inside = 0;
      rows[y * w + x] = inside;
    }
  }
  const core = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = 1;
      for (let k = Math.max(0, y - band); k <= Math.min(h - 1, y + band) && inside; k++) inside = rows[k * w + x];
      core[y * w + x] = inside;
    }
  }
  // Summed-area tables of the interior's colour and pixel count (r, g, b, n), so a window's mean is four lookups.
  const sw = w + 1;
  const sums = new Float64Array(sw * (h + 1) * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const at = ((y + 1) * sw + x + 1) * 4;
      for (let c = 0; c < 4; c++) {
        const v = core[i] === 0 ? 0 : c === 3 ? 1 : rgba[i * 4 + c];
        sums[at + c] = v + sums[at - sw * 4 + c] + sums[at - 4 + c] - sums[at - sw * 4 - 4 + c];
      }
    }
  }
  const out = new Uint8Array(rgba);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - reach) * sw;
    const y1 = Math.min(h, y + reach + 1) * sw;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] === 0 || core[i] === 1) continue;
      const x0 = Math.max(0, x - reach);
      const x1 = Math.min(w, x + reach + 1);
      const box = (c: number): number => sums[(y1 + x1) * 4 + c] - sums[(y0 + x1) * 4 + c] - sums[(y1 + x0) * 4 + c] + sums[(y0 + x0) * 4 + c];
      const n = box(3);
      if (n === 0) continue;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(box(c) / n);
    }
  }
  return out;
}

/** The photo: neck shaded (portrait.mts), defringed, scaled, placed, graded into the room and rim-lit by the lamp. */
async function bust(): Promise<Placed> {
  const { data, info } = await sharp(FACE_FILE).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== SOURCE.width || info.height !== SOURCE.height) throw new Error(`face.png is ${info.width}×${info.height}`);
  const shaded = defringe(shadeNeck(new Uint8Array(data.buffer, data.byteOffset, data.length), info.width, info.height), info.width, info.height);
  const pw = Math.round(SOURCE.width * BUST.scale);
  const ph = Math.round(SOURCE.height * BUST.scale);
  const scaled = await sharp(Buffer.from(shaded), { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(pw, ph, { kernel: "lanczos3" })
    .raw()
    .toBuffer();
  const left = Math.round(BUST.headX - FACE.centre * BUST.scale);
  const top = Math.round(BUST.crownY - FACE.crown * BUST.scale);
  if (top + ph < H + BUST.overhang) throw new Error(`The photo ends at y=${top + ph}, above the frame's bottom edge plus ${BUST.overhang}px`);
  const chinY = top + FACE.chin * BUST.scale;
  const headLeft = left + FACE.left * BUST.scale;
  const headRight = left + FACE.right * BUST.scale;

  const alpha = new Float32Array(W * H);
  const rgb = new Float32Array(W * H * 3);
  for (let y = Math.max(0, top); y < Math.min(H, top + ph); y++) {
    for (let x = Math.max(0, left); x < Math.min(W, left + pw); x++) {
      const s = ((y - top) * pw + (x - left)) * 4;
      const i = y * W + x;
      alpha[i] = scaled[s + 3] / 255;
      for (let c = 0; c < 3; c++) rgb[i * 3 + c] = scaled[s + c] / 255;
    }
  }

  // The rim: how far inside an edge that faces the lamp each pixel is (the blurred alpha, looked up towards the lamp).
  const blurred = await sharp(Buffer.from(Uint8Array.from(alpha, (v) => Math.round(v * 255))), { raw: { width: W, height: H, channels: 1 } })
    .blur(RIM.blur)
    .extractChannel(0)
    .raw()
    .toBuffer();
  if (blurred.length !== W * H) throw new Error(`The blurred alpha came back with ${blurred.length / (W * H)} channels`);
  // Clamped to the frame: the photo carries on past its edges, so the frame's edge is not a silhouette edge.
  const outside = (x: number, y: number): number =>
    1 - blurred[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))] / 255;

  const lamp = linear(TUNGSTEN);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (alpha[i] === 0) continue;
      // Key from the lamp's side, the far cheek a stop down; the body falls off towards the frame's bottom.
      const key = 0.72 + 0.28 * smoothstep(headLeft, headRight + 40, x);
      const fall = 1 - 0.45 * smoothstep(chinY, H, y);
      const rim = outside(x + RIM.dx, y + RIM.dy) * RIM.strength * Math.min(1, 1.5 * Math.exp(-2 * lampDistance2(x, y)));
      const warm = [1.05, 1.0, 0.9];
      for (let c = 0; c < 3; c++) {
        const lin = toLinear(rgb[i * 3 + c]) * 0.86 * warm[c] * key * fall;
        rgb[i * 3 + c] = clamp01(toSrgb(lin + rim * lamp[c]));
      }
      // The tee sinks into the dark as the frame cuts it (the photo itself runs on past the edge).
      alpha[i] *= 1 - smoothstep(H - 70, H + 10, y) * 0.85;
    }
  }
  return { rgb, alpha, chinY };
}

/** Paints `colour` over `canvas` (sRGB) through a coverage mask. */
function paint(canvas: Float32Array, mask: Float32Array, colour: Rgb): void {
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i];
    if (a === 0) continue;
    for (let c = 0; c < 3; c++) canvas[i * 3 + c] += (colour[c] / 255 - canvas[i * 3 + c]) * a;
  }
}

async function main(): Promise<void> {
  const [first, last] = SITE.name.toUpperCase().split(" ");
  const slate = [`${SITE.role} — ${SITE.location.city}, ${SITE.location.country}`.toUpperCase(), new URL(SITE.url).host.toUpperCase()];

  const hero = variableFont(HERO_FONT, { wght: NAME.wght, wdth: NAME.wdth });
  const mono = await monoFont(slate.join(""));
  const capHeight = (hero.capHeight / hero.unitsPerEm) * NAME.size;
  const lastLine = line(hero, last, NAME.size, NAME.tracking, NAME.x, NAME.baseline);
  const firstLine = line(hero, first, NAME.size, NAME.tracking, NAME.x, NAME.baseline - NAME.leading * NAME.size);
  const slateLines = slate.map((text, i) => line(mono, text, SLATE.size, SLATE.tracking, SLATE.x, SLATE.baselines[i]));

  const photo = await bust();
  const capTop = NAME.baseline - capHeight;
  if (capTop < photo.chinY) throw new Error(`RONDINA's cap line (${capTop.toFixed(0)}px) would cross the face (chin at ${photo.chinY.toFixed(0)}px)`);
  const right = NAME.x + Math.max(firstLine.width, lastLine.width);
  if (right > SAFE.x + SAFE.w || NAME.baseline > SAFE.y + SAFE.h) throw new Error(`The name overflows the safe box (right edge ${right.toFixed(0)}px)`);

  const canvas = room();
  paint(canvas, await coverage([firstLine.d]), BONE);
  for (let i = 0; i < W * H; i++) {
    const a = photo.alpha[i];
    if (a === 0) continue;
    for (let c = 0; c < 3; c++) canvas[i * 3 + c] += (photo.rgb[i * 3 + c] - canvas[i * 3 + c]) * a;
  }
  paint(canvas, await coverage([lastLine.d]), BONE);
  paint(canvas, await coverage([slateLines[0].d]), ASH);
  paint(canvas, await coverage([slateLines[1].d]), TUNGSTEN);

  const pixels = Uint8Array.from(canvas, (v) => Math.round(clamp01(v) * 255));
  await sharp(Buffer.from(pixels), { raw: { width: W, height: H, channels: 3 } })
    .jpeg(JPEG)
    .toFile(OUT);
  const bytes = statSync(OUT).size;
  console.log(
    `${relative(ROOT, OUT)}  ${W}×${H}  ${bytes} B  (name ${Math.round(right - NAME.x)}px wide, cap top ${capTop.toFixed(0)}px, chin ${photo.chinY.toFixed(0)}px)`,
  );
  if (bytes > BUDGET_BYTES) throw new Error(`${relative(ROOT, OUT)} is ${bytes} B, over the ${BUDGET_BYTES} B budget`);
}

await main();
