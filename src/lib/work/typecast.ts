// Re-casting (Wayne's W20): once its flood completes, a reel title changes face, from the night face
// (Google Sans Flex at the night axes) into the display face of the brand's own site, and back when
// the flood drops. ReelTitle renders both faces stacked in the <h3 data-typecast>; createCast() fits
// them, loads the brand face as its reel comes near, arms the title (work.css then shows the brand
// face) and tweens --cast, which moves the wipe between the two faces' masks.

import { gsap } from "@/lib/motion/gsap";

import { DURATION } from "@/lib/motion/tokens";
import { FIT_PROBE_PX, fitFromWidth } from "@/lib/work/typecast-presets";

/** Seconds the re-cast takes: the regrade (0.9s), on the dolly ease. */
const CAST_DURATION = DURATION.regrade;

/** A brand face starts loading once its reel is within a viewport of the screen. */
const LOAD_AHEAD = "100% 0px";

/**
 * The face's --fit: a hidden nowrap copy of it, set at FIT_PROBE_PX beside it in the title (so it
 * inherits the title's axis and face variables), measured and removed.
 */
function measureFit(face: HTMLElement): number | null {
  const probe = face.cloneNode(true) as HTMLElement;
  probe.removeAttribute("data-title-face");
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "absolute",
    top: "0",
    left: "0",
    display: "block",
    visibility: "hidden",
    whiteSpace: "nowrap",
    margin: "0",
    padding: "0",
    fontSize: `${FIT_PROBE_PX}px`,
  });
  face.after(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return fitFromWidth(width);
}

/** Loads the face the element is set in; false if it cannot be loaded (the title keeps its night face). */
async function loadFace(face: HTMLElement): Promise<boolean> {
  const { fontStyle, fontWeight, fontFamily } = getComputedStyle(face);
  try {
    const loaded = await document.fonts.load(`${fontStyle} ${fontWeight} ${FIT_PROBE_PX}px ${fontFamily}`, face.textContent ?? "");
    return loaded.length > 0;
  } catch {
    return false;
  }
}

export interface Cast {
  /** Re-cast in the brand face. `instant` lands there with no animation (a jump into the reel). */
  toBrand(instant?: boolean): void;
  /** Back to the night face. */
  toNight(): void;
  /** From night to brand again. */
  replay(): void;
  /** Stop, and give the title back its server-rendered state. */
  revert(): void;
}

/**
 * The cast for one <h3 data-typecast>. Once document.fonts.ready, it fits the night face (the title
 * rests in it). When its reel comes within a viewport of the screen it loads the brand face (a 1–2
 * KB subset), fits it and arms the title; motion allowed, the re-cast is then a paused 0.9s dolly
 * tween of --cast from 0 to 1 (work.css wipes the brand face in over the night face, left to right)
 * that plays forward to the brand and reverses to night. Under reduced motion every change applies at
 * once. Requests made before the title is armed are kept, and the latest one applies when it is; a
 * brand face that fails to load leaves the title in its night face.
 */
export function createCast(title: HTMLElement, { reduced }: { reduced: boolean }): Cast {
  const night = title.querySelector<HTMLElement>('[data-title-face="night"]');
  const brand = title.querySelector<HTMLElement>('[data-title-face="brand"]');
  const originalStyle = title.getAttribute("style");

  let target: "night" | "brand" = "night";
  let instant = false;
  let tween: gsap.core.Tween | null = null;
  let observer: IntersectionObserver | null = null;
  /** Set once the brand face is loaded and fitted, and the title shows it through --cast. */
  let armed = false;
  let reverted = false;

  function render(): void {
    if (!armed) return;
    if (!tween) title.style.setProperty("--cast", target === "brand" ? "1" : "0");
    else if (target === "night") tween.reverse();
    else if (instant) tween.progress(1).pause();
    else tween.play();
  }

  async function arm(face: HTMLElement): Promise<void> {
    if (!(await loadFace(face)) || reverted) return;
    const fit = measureFit(face);
    if (fit === null) return;
    title.style.setProperty("--fit-brand", String(fit));
    if (!reduced) {
      tween = gsap.fromTo(title, { "--cast": 0 }, { "--cast": 1, duration: CAST_DURATION, ease: "dolly", paused: true });
    }
    title.toggleAttribute("data-cast-armed", true);
    armed = true;
    render();
  }

  async function prepare(): Promise<void> {
    await document.fonts.ready;
    if (reverted || !night) return;
    const fit = measureFit(night);
    if (fit !== null) title.style.setProperty("--fit", String(fit));
    if (!brand) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        observer = null;
        void arm(brand);
      },
      { rootMargin: LOAD_AHEAD },
    );
    // The reel, not the title: the flood's clip-path hides the title from an observer until it lights.
    observer.observe(title.closest<HTMLElement>("[data-reel]") ?? title);
  }

  void prepare();

  return {
    toBrand(landed = false) {
      target = "brand";
      instant = landed;
      render();
    },
    toNight() {
      target = "night";
      instant = false;
      render();
    },
    replay() {
      target = "brand";
      instant = false;
      if (tween) tween.restart();
      else render();
    },
    revert() {
      reverted = true;
      observer?.disconnect();
      tween?.kill();
      title.removeAttribute("data-cast-armed");
      if (originalStyle === null) title.removeAttribute("style");
      else title.setAttribute("style", originalStyle);
    },
  };
}
