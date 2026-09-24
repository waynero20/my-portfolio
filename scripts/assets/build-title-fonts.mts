/**
 * Builds the reel titles' brand faces (Wayne's W20).   npm run assets:titles
 *
 * Each reel's title is re-cast in the display face its brand's own site sets headings in
 * (PROJECTS[].titleFont in data.ts). For each reel this asks the Google Fonts CSS2 API for that face
 * at its exact weight and style, subset to the title's glyphs (`&text=`; a modern user agent gets
 * woff2), and saves it; src/lib/fonts.ts registers each file with next/font/local.
 *
 * - src/assets/fonts/titles/{slug}.woff2: one title's glyphs, a few KB
 * - src/assets/fonts/titles/OFL.txt: the licences of the families (all SIL OFL 1.1)
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { openSync } from "fontkit";
import { PROJECTS } from "../../src/lib/data.ts";
import type { Project } from "../../src/lib/types/content.ts";
import { fromRoot } from "../lib/paths.mts";

const OUT_DIR = fromRoot("src/assets/fonts/titles");
const OFL_TXT = `${OUT_DIR}/OFL.txt`;

const CSS_API = "https://fonts.googleapis.com/css2";
const OFL_UPSTREAM = "https://raw.githubusercontent.com/google/fonts/main/ofl";

/** The CSS2 API picks the file format by user agent; a current desktop Chrome gets woff2. */
const MODERN_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/** Budget per file in bytes: a title's glyphs are a few KB, so more means the subset did not happen. */
const BUDGET_BYTES = 12_000;

/** The characters a title renders in its brand face, in that face's case, once each. */
function titleGlyphs({ title, titleFont }: Project): string {
  const text = titleFont.textCase === "upper" ? title.toUpperCase() : title;
  return [...new Set(text)].sort().join("");
}

function cssUrl(project: Project): string {
  const { family, weight, style } = project.titleFont;
  const axes = style === "italic" ? `ital,wght@1,${weight}` : `wght@${weight}`;
  return `${CSS_API}?family=${family.replaceAll(" ", "+")}:${axes}&text=${encodeURIComponent(titleGlyphs(project))}`;
}

async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return response;
}

/** The woff2 URL in the API's stylesheet; a `text=` request answers with a single @font-face. */
async function woff2Url(project: Project): Promise<string> {
  const css = await (await get(cssUrl(project), { "User-Agent": MODERN_UA })).text();
  const sources = [...css.matchAll(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/g)].map((match) => match[1]);
  if (sources.length !== 1) throw new Error(`${project.slug}: expected one woff2 source, got ${sources.length}:\n${css}`);
  return sources[0];
}

/** Throws unless the file is a single face with a glyph for every character of the title. */
function check(project: Project, path: string): { axes: string } {
  const font = openSync(path);
  if (!("hasGlyphForCodePoint" in font)) throw new Error(`${path} is a font collection, expected a single font`);
  const missing = [...titleGlyphs(project)].filter((ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0));
  if (missing.length > 0) throw new Error(`${path} has no glyph for ${JSON.stringify(missing.join(""))}`);
  const axes = Object.keys(font.variationAxes);
  return { axes: axes.length > 0 ? `variable (${axes.join(", ")})` : "static" };
}

/** google/fonts keeps each family under ofl/<name in lowercase, no spaces>/. */
const oflUrl = (family: string): string => `${OFL_UPSTREAM}/${family.toLowerCase().replaceAll(" ", "")}/OFL.txt`;

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const project of PROJECTS) {
    const { slug, titleFont } = project;
    const out = `${OUT_DIR}/${slug}.woff2`;
    const url = await woff2Url(project);
    writeFileSync(out, Buffer.from(await (await get(url)).arrayBuffer()));
    const { axes } = check(project, out);
    const bytes = statSync(out).size;
    const face = `${titleFont.family} ${titleFont.weight}${titleFont.style === "italic" ? " italic" : ""}`;
    console.log(`${out}  ${bytes} B  ${face}, ${axes}, glyphs ${JSON.stringify(titleGlyphs(project))}`);
    if (bytes > BUDGET_BYTES) throw new Error(`${slug}.woff2 is ${bytes} B, over the ${BUDGET_BYTES} B budget`);
  }

  const families = [...new Set(PROJECTS.map(({ titleFont }) => titleFont.family))];
  const licences = await Promise.all(
    families.map(async (family) => `${family}\n${"=".repeat(family.length)}\n\n${(await (await get(oflUrl(family))).text()).trim()}\n`),
  );
  writeFileSync(OFL_TXT, licences.join("\n\n"));
  console.log(`${OFL_TXT}  ${families.length} families`);
}

await main();
