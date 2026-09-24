import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (scripts/lib/ → ../../). */
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Absolute path of a repo-relative path. */
export const fromRoot = (...parts: string[]): string => join(ROOT, ...parts);
