import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import type { ClassValue } from "clsx";

// Mirrors the custom --text-*, --ease-* and --radius-* keys in globals.css (utils.test.ts checks them).
// Without this, tailwind-merge reads text-display as a colour and drops it next to text-bone.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h2", "body", "body-lg", "mono"],
      ease: ["dolly", "settle"],
      radius: ["screen", "key"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
