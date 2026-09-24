// The ONLY place GSAP plugins are registered. Import gsap and its plugins from here, in client code
// only. ScrollTrigger and CustomEase load statically (Lenis and every scene need them); SplitText
// and Flip load on demand through the loaders below.

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import type { Flip } from "gsap/dist/Flip";
import type { SplitText } from "gsap/SplitText";

import { isBrowser } from "@/lib/dom";
import { DURATION, EASE } from "@/lib/motion/tokens";

if (isBrowser) {
  gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);
  CustomEase.create("dolly", EASE.dolly.join(","));
  CustomEase.create("settle", EASE.settle.join(","));
  gsap.defaults({ ease: "settle", duration: DURATION.ui });
}

export { gsap, ScrollTrigger, CustomEase, useGSAP };

let refreshFrame = 0;

/** ScrollTrigger.refresh() on the next frame, coalescing every request made before it runs. */
export function requestRefresh(): void {
  if (!isBrowser || refreshFrame) return;
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0;
    ScrollTrigger.refresh();
  });
}

export async function loadSplitText(): Promise<typeof SplitText> {
  const { SplitText } = await import("gsap/SplitText");
  gsap.registerPlugin(SplitText);
  return SplitText;
}

/** Imported from gsap/dist/Flip: `gsap/Flip` fails with TS1149 on macOS's case-insensitive file system. */
export async function loadFlip(): Promise<typeof Flip> {
  const { Flip } = await import("gsap/dist/Flip");
  gsap.registerPlugin(Flip);
  return Flip;
}
