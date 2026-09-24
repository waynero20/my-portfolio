// The content model. src/lib/data.ts holds the values; Node scripts import it, so this file stays
// free of DOM, React and value imports.

export type ReelSlug = "bloom" | "legacy" | "tampus" | "tutorloop" | "horizon" | "matchme" | "pickanddink";

export type Hex = `#${string}`;

export type Edition = "client" | "team";

export type StackLayer = "framework" | "interface" | "data" | "content" | "cloud";

export type IndustryId = "retail" | "healthcare" | "education" | "travel-logistics" | "sports-recreation";

/** Every tool in TOOLS: the per-project call sheet plus the everyday kit. */
export type ToolId =
  | "nextjs"
  | "typescript"
  | "express"
  | "tailwind"
  | "gsap"
  | "framer-motion"
  | "daisyui"
  | "zod"
  | "supabase"
  | "postgresql"
  | "prisma"
  | "react-query"
  | "socket-io"
  | "contentful"
  | "cloudinary"
  | "cloudfront"
  | "rekognition"
  | "textract"
  | "git"
  | "vercel"
  | "rest-apis"
  | "upstash-redis"
  | "s3";

export interface ReelTheme {
  scheme: "light" | "dark";
  surface: Hex;
  ink: Hex;
  /** Hand-set per brand (not alpha-derived), ≥4.5:1 on the surface. */
  muted: Hex;
  accent: Hex;
  accentUse: "text" | "large" | "decorative";
  ctaBg: Hex;
  ctaInk: Hex;
  focus: Hex;
  /** The brand's dot on night surfaces, ≥3:1 on booth and seat. */
  nightDot: Hex;
  spill: readonly [Hex, Hex];
  spillMode: "ambilight" | "split";
  titleGradient?: readonly [Hex, Hex];
}

export interface TypecastPreset {
  wght: number;
  wdth: number;
  rond: number;
  textCase?: "lower" | "upper";
  trackingEm?: number;
  tabular?: boolean;
}

/**
 * A reel title's brand face (Wayne's W20): the display face the brand's own site sets its headings
 * in, as that site sets it. npm run assets:titles fetches it subset to the title's glyphs.
 */
export interface TitleFont {
  /** The Google Fonts family. */
  family: string;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
  textCase?: "upper";
  /** letter-spacing, in em. */
  trackingEm?: number;
  /** Where the brand's repo sets the face (sibling repo and files). */
  source: string;
}

export type LiveLink = { kind: "public"; href: string } | { kind: "private"; label: string; mailSubject: string };

export interface Project {
  slug: ReelSlug;
  abbr: string;
  title: string;
  category: string;
  market: string | null;
  tagline: string;
  story: string;
  highlights: readonly [string, string, string];
  outcome: string | null;
  stack: readonly ToolId[];
  stackConfirmed: boolean;
  industry: IndustryId;
  live: LiveLink;
  theme: ReelTheme;
  /** The face the title is re-cast in once the reel floods; until then it wears NIGHT_TYPECAST. */
  titleFont: TitleFont;
  /** `zoom` scales the mark inside its plate, for a file with a lot of built-in whitespace. */
  logo: { src: string; width: number; height: number; alt: string; zoom?: number };
  overlay: { src: string; blend: "multiply" | "screen"; opacity: number };
}

export interface Tool {
  id: ToolId;
  name: string;
  abbr: string;
  layer: StackLayer;
  /** One line on why it was used; null hides the line. */
  why: string | null;
}

export interface Service {
  /** A stable word id (the row's DOM ids). Never shown: the page has no index numbers (W12). */
  id: string;
  title: string;
  deliverables: readonly string[];
  reels: readonly ReelSlug[];
}

export interface ProcessStage {
  tag: "PRE" | "PROD" | "POST" | "PREMIERE";
  title: string;
  body: string;
  confirmed: boolean;
}
