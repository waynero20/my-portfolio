/**
 * Builds the self-hosted Google Sans Flex faces and the hero metrics.   npm run assets:fonts
 *
 * - src/assets/fonts/gsf-hero.woff2: "ADEINORWY " only, wght 1–1000 × wdth 25–151 (display, preloaded)
 * - src/assets/fonts/gsf-text.woff2: latin, wght × wdth × ROND (text face)
 * - src/assets/fonts/OFL.txt
 * - src/lib/generated/hero-font-metrics.json: fontkit metrics of the hero face at wght 640
 */
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { openSync } from "fontkit";
import type { Font } from "fontkit";
import { fromRoot } from "../lib/paths.mts";
import { run } from "../lib/run.mts";

const UPSTREAM = "https://raw.githubusercontent.com/google/fonts/main/ofl/googlesansflex";
const TTF_NAME = "GoogleSansFlex[GRAD,ROND,opsz,slnt,wdth,wght].ttf";

const SOURCE_DIR = fromRoot("asset-sources/fonts");
const BUILD_DIR = fromRoot("asset-sources/fonts/build");
const SOURCE_TTF = `${SOURCE_DIR}/${TTF_NAME}`;
const SOURCE_OFL = `${SOURCE_DIR}/OFL.txt`;

const OUT_DIR = fromRoot("src/assets/fonts");
const HERO_WOFF2 = `${OUT_DIR}/gsf-hero.woff2`;
const TEXT_WOFF2 = `${OUT_DIR}/gsf-text.woff2`;
const METRICS_JSON = fromRoot("src/lib/generated/hero-font-metrics.json");

const FONTTOOLS = ["--from", "fonttools[woff]==4.65.0", "fonttools"];

const HERO_TEXT = "ADEINORWY ";
/** Display weight of the hero name (T8). */
const HERO_WGHT = 640;
const HERO_WDTHS = [25, 75, 100, 112, 151] as const;
const HERO_WORDS = ["WAYNE", "RONDINA"] as const;

/** Budgets in bytes. The text face (~160 KB) has no hard budget. */
const HERO_BUDGET = 15_000;

/**
 * Google Fonts' latin range (Basic Latin, Latin-1 Supplement, general punctuation, €, ™ and friends),
 * plus the whole currency block (₱) and the site's symbols: → ↗ ● ✓. (× · — ↓ are already in range.)
 * Upstream Google Sans Flex has no ₱ → ↗ ↓ ● ✓ glyphs yet; they are listed so a future release picks them up.
 */
const TEXT_UNICODES = [
  "U+0000-00FF",
  "U+0131",
  "U+0152-0153",
  "U+02BB-02BC",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0304",
  "U+0308",
  "U+0329",
  "U+2000-206F",
  "U+20A0-20CF",
  "U+2122",
  "U+2191-2193",
  "U+2197",
  "U+2212",
  "U+2215",
  "U+25CF",
  "U+2713",
  "U+FEFF",
  "U+FFFD",
].join(",");

/** Symbols the brief requires in the text face; the script warns if the font has no glyph for one. */
const REQUIRED_SYMBOLS = "₱→×↗↓·—●✓";

async function download(name: string, to: string): Promise<void> {
  if (existsSync(to)) {
    console.log(`cached  ${to}`);
    return;
  }
  const url = `${UPSTREAM}/${encodeURIComponent(name).replaceAll("%2C", ",")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  writeFileSync(to, Buffer.from(await response.arrayBuffer()));
  console.log(`fetched ${url}`);
}

const fonttools = (args: string[]): string => run("uvx", [...FONTTOOLS, ...args]);

function instance(pins: string[], output: string): void {
  fonttools(["varLib.instancer", SOURCE_TTF, ...pins, "-o", output]);
}

function openFont(path: string): Font {
  const font = openSync(path);
  if (!("layout" in font)) throw new Error(`${path} is a font collection, expected a single font`);
  return font;
}

/** Font units, rounded to 1/100 to drop float noise from the interpolated advances. */
const units = (n: number): number => Math.round(n * 100) / 100;

/** Metrics in font units; advances are kerned (GPOS) at wght 640 for each wdth. */
function heroMetrics(ttf: string): object {
  const font = openFont(ttf);
  const advanceAt = (word: string, wdth: number): number =>
    units(font.getVariation({ wght: HERO_WGHT, wdth }).layout(word).advanceWidth);
  const advances = Object.fromEntries(
    HERO_WORDS.map((word) => [word, Object.fromEntries(HERO_WDTHS.map((wdth) => [String(wdth), advanceAt(word, wdth)]))]),
  );
  return {
    unitsPerEm: font.unitsPerEm,
    capHeight: font.capHeight,
    ascender: font.ascent,
    descender: font.descent,
    wght: HERO_WGHT,
    advances,
  };
}

function missingSymbols(ttf: string): string[] {
  const font = openFont(ttf);
  return [...REQUIRED_SYMBOLS].filter((ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0));
}

async function main(): Promise<void> {
  mkdirSync(BUILD_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(METRICS_JSON), { recursive: true });

  await download(TTF_NAME, SOURCE_TTF);
  await download("OFL.txt", SOURCE_OFL);

  // Hero: a glyph subset for the name; wght and wdth stay variable for the dolly zoom.
  const heroInstance = `${BUILD_DIR}/hero-instance.ttf`;
  const heroTtf = `${BUILD_DIR}/gsf-hero.ttf`;
  instance(["GRAD=0", "ROND=0", "slnt=0", "opsz=144"], heroInstance);
  const heroSubset = [heroInstance, `--text=${HERO_TEXT}`, "--layout-features=kern,liga"];
  fonttools(["subset", ...heroSubset, `--output-file=${heroTtf}`]);
  fonttools(["subset", ...heroSubset, "--flavor=woff2", `--output-file=${HERO_WOFF2}`]);

  // Text: latin; wght, wdth and ROND stay variable. Default layout features plus tnum (+~10 KB) for
  // tabular figures (the Cebu clock, the call sheet counts).
  const textInstance = `${BUILD_DIR}/text-instance.ttf`;
  const textTtf = `${BUILD_DIR}/gsf-text.ttf`;
  instance(["GRAD=0", "opsz=18", "slnt=0"], textInstance);
  const textSubset = [textInstance, `--unicodes=${TEXT_UNICODES}`, "--layout-features+=tnum"];
  fonttools(["subset", ...textSubset, `--output-file=${textTtf}`]);
  fonttools(["subset", ...textSubset, "--flavor=woff2", `--output-file=${TEXT_WOFF2}`]);

  copyFileSync(SOURCE_OFL, `${OUT_DIR}/OFL.txt`);
  writeFileSync(METRICS_JSON, `${JSON.stringify(heroMetrics(heroTtf), null, 2)}\n`);

  const missing = missingSymbols(textTtf);
  if (missing.length > 0) console.warn(`WARNING: the text face has no glyph for ${missing.join(" ")} (browsers fall back)`);

  const heroBytes = statSync(HERO_WOFF2).size;
  console.log(`${HERO_WOFF2}  ${heroBytes} B  (budget ${HERO_BUDGET} B)`);
  console.log(`${TEXT_WOFF2}  ${statSync(TEXT_WOFF2).size} B`);
  console.log(`${METRICS_JSON}  ${statSync(METRICS_JSON).size} B`);
  if (heroBytes > HERO_BUDGET) throw new Error(`gsf-hero.woff2 is ${heroBytes} B, over the ${HERO_BUDGET} B budget`);
}

await main();
