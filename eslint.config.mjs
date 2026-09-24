import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const GSAP_LOADER_MESSAGE = "Load GSAP plugins through the loaders in @/lib/motion/gsap.";
const LENIS_MESSAGE = "Lenis is internal to src/lib/motion. Use scrollToTarget from @/lib/motion/scroll.";

const GSAP_PLUGIN_PATHS = ["gsap/Flip", "gsap/Observer", "gsap/Draggable"].map((name) => ({
  name,
  message: GSAP_LOADER_MESSAGE,
}));

const APP_RESTRICTED_PATHS = [
  { name: "framer-motion", message: "framer-motion was removed. Animate with GSAP via @/lib/motion/gsap." },
  {
    name: "next/navigation",
    importNames: ["useSearchParams"],
    message: "useSearchParams makes / dynamic. The page must stay static (○ /).",
  },
];

// Outside src/lib/motion/** every specifier that loads these modules is banned, not just the bare
// name: gsap's dist/ and src/ builds, .js/.min.js files, gsap/all (it re-exports every plugin) and
// every lenis subpath except its stylesheet. The motion loaders import gsap/dist/Flip themselves,
// so these stay out of that scope. They also cover the bare gsap/* names in GSAP_PLUGIN_PATHS.
const NON_MOTION_IMPORT_PATTERNS = [
  {
    regex: String.raw`^gsap/(?:.+/)?(?:all|Flip|Observer|Draggable|SplitText)(?:\.|$)`,
    message: GSAP_LOADER_MESSAGE,
  },
  { regex: String.raw`^lenis(?:/(?!dist/lenis\.css$)|$)`, message: LENIS_MESSAGE },
];

// no-restricted-imports skips dynamic import(), so the same patterns are matched on ImportExpression,
// with the same case-insensitive flags ESLint compiles `regex` patterns with.
function dynamicImportBan({ regex, message }) {
  return { selector: `ImportExpression[source.value=/${regex.replaceAll("/", "\\/")}/iu]`, message };
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "public/**",
    "asset-sources/**",
    "video-sources/**",
    ".superpowers/**",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-imports": ["error", { paths: [...GSAP_PLUGIN_PATHS, ...APP_RESTRICTED_PATHS] }],
    },
  },
  {
    ignores: ["src/lib/motion/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: APP_RESTRICTED_PATHS, patterns: NON_MOTION_IMPORT_PATTERNS }],
      "no-restricted-syntax": ["error", ...NON_MOTION_IMPORT_PATTERNS.map(dynamicImportBan)],
    },
  },
  {
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
]);
