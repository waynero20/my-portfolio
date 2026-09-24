// Re-casting (Wayne's W20): once its flood completes, a reel title changes face, from the night face
// (Google Sans Flex at the night axes) into the display face of the brand's own site, and back when
// the flood drops. ReelTitle renders both faces stacked in the <h3 data-typecast>; createCasts() fits
// them, loads every brand face while the page is idle, arms the titles (work.css then shows the brand
// face) and tweens --cast, which moves the wipe between the two faces' masks.

import { gsap } from "@/lib/motion/gsap";

import { onIdle } from "@/lib/dom";
import { DURATION } from "@/lib/motion/tokens";
import { FIT_PROBE_PX, fitFromWidth } from "@/lib/work/typecast-presets";

/** Seconds the re-cast takes: the regrade (0.9s), on the dolly ease. */
const CAST_DURATION = DURATION.regrade;

/** Below lg (useMotionScene rebuilds the casts across it), the wipe is a clip-path seam (work.css). */
const CLIP_WIPE_QUERY = "(max-width: 1023.98px)";

/**
 * "clip" below lg and on iOS (every iOS browser is WebKit, and only it supports -webkit-touch-callout),
 * whose text masks go stale mid-wipe; "" keeps desktop's soft mask wipe.
 */
function wipeKind(): "clip" | "" {
  const clip = window.matchMedia(CLIP_WIPE_QUERY).matches || CSS.supports("-webkit-touch-callout", "none");
  return clip ? "clip" : "";
}

/**
 * Every face's --fit, in one layout: a hidden nowrap copy of each, set at FIT_PROBE_PX beside it in its
 * title (so it inherits the title's axis and face variables), is inserted before any is measured, then
 * all are removed. Measured one at a time, each copy would force a layout of its own.
 */
function measureFits(faces: readonly HTMLElement[]): (number | null)[] {
  const probes = faces.map((face) => {
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
    return probe;
  });
  const widths = probes.map((probe) => probe.getBoundingClientRect().width);
  for (const probe of probes) probe.remove();
  return widths.map((width) => fitFromWidth(width));
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

/** The next time the main thread is idle, as a promise. */
function idle(): Promise<void> {
  return new Promise((resolve) => onIdle(resolve));
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

interface Title {
  title: HTMLElement;
  night: HTMLElement | null;
  brand: HTMLElement | null;
  cast: Cast;
  /** Fits the loaded brand face (null: it could not be measured) and arms the title. */
  arm(fit: number | null): void;
  /** The cast has been reverted: nothing may touch the title any more. */
  reverted(): boolean;
}

/**
 * The cast for one <h3 data-typecast>. Once armed, the re-cast is a paused 0.9s dolly tween of --cast
 * from 0 to 1 (work.css wipes the brand face in over the night face, left to right) that plays forward
 * to the brand and reverses to night; under reduced motion every change applies at once. Requests
 * made before the title is armed are kept, and the latest one applies when it is.
 */
function castTitle(title: HTMLElement, reduced: boolean): Title {
  const night = title.querySelector<HTMLElement>('[data-title-face="night"]');
  const brand = title.querySelector<HTMLElement>('[data-title-face="brand"]');
  const originalStyle = title.getAttribute("style");

  let target: "night" | "brand" = "night";
  let instant = false;
  let tween: gsap.core.Tween | null = null;
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

  return {
    title,
    night,
    brand,
    reverted: () => reverted,
    arm(fit) {
      if (reverted || fit === null) return;
      title.style.setProperty("--fit-brand", String(fit));
      if (!reduced) {
        tween = gsap.fromTo(title, { "--cast": 0 }, { "--cast": 1, duration: CAST_DURATION, ease: "dolly", paused: true });
      }
      title.setAttribute("data-cast-armed", wipeKind());
      armed = true;
      render();
    },
    cast: {
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
        tween?.kill();
        title.removeAttribute("data-cast-armed");
        if (originalStyle === null) title.removeAttribute("style");
        else title.setAttribute("style", originalStyle);
      },
    },
  };
}

/**
 * The casts for a set of <h3 data-typecast>, prepared together so none of it lands mid-scroll. Once
 * document.fonts.ready, every night face is fitted in one layout (the titles rest in it). Then, once
 * the main thread is idle, every brand face (a 1–2 KB subset) loads in parallel, and they are fitted in
 * one layout and armed together. Loading one face per reel as it came near cost a hitch at every
 * hand-off: a face that finishes loading restyles the page (a full style rebuild in WebKit), and each
 * fit forced a layout of its own. A brand face that fails to load leaves its title in the night face.
 */
export function createCasts(titles: readonly HTMLElement[], { reduced }: { reduced: boolean }): Cast[] {
  const entries = titles.map((title) => castTitle(title, reduced));
  const live = () => entries.filter((entry) => !entry.reverted());

  async function prepare(): Promise<void> {
    await document.fonts.ready;
    const resting = live().flatMap((entry) => (entry.night ? [{ entry, face: entry.night }] : []));
    measureFits(resting.map(({ face }) => face)).forEach((fit, i) => {
      if (fit !== null) resting[i].entry.title.style.setProperty("--fit", String(fit));
    });

    await idle();
    const branded = live().flatMap((entry) => (entry.brand ? [{ entry, face: entry.brand }] : []));
    const loaded = await Promise.all(branded.map(({ face }) => loadFace(face)));
    const ready = branded.filter(({ entry }, i) => loaded[i] && !entry.reverted());
    measureFits(ready.map(({ face }) => face)).forEach((fit, i) => ready[i].entry.arm(fit));
  }

  void prepare();
  return entries.map((entry) => entry.cast);
}
