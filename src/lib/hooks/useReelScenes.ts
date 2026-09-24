import { atmosphere } from "@/lib/atmosphere";
import { useMotionScene } from "@/lib/hooks/useMotionScene";
import { gsap, requestRefresh, ScrollTrigger } from "@/lib/motion/gsap";
import { scrollToTarget } from "@/lib/motion/scroll";
import { reelStore } from "@/lib/motion/state";

import type { RefObject } from "react";
import type { ReelSlug, SceneFlags } from "@/lib/types";
import type { ReelFades, ReelGeometry, ScrollRecord } from "@/lib/work/flood";
import type { Cast } from "@/lib/work/typecast";

import { noteFlood } from "@/lib/work/flash-guard";
import {
  FLOOD_ACTIVE,
  PHONE_BEZEL_PX,
  SCREEN_BEZEL_PX,
  clipInsets,
  floodEndPx,
  isTeleport,
  litBox,
  reelFades,
  reelGeometry,
  reelPhoneGeometry,
  scrollJump,
  svhToPx,
} from "@/lib/work/flood";
import { reelScreens } from "@/lib/work/screens";
import { createCasts } from "@/lib/work/typecast";

/**
 * The phases track the scroll exactly (scrub: true), not through SCRUB's 0.6s smoothing: Lenis
 * already glides the scroll on desktop, and a lagging flood would let the outgoing stage (whose
 * unstick is pure scroll position) slide away before the incoming room has covered it, showing a
 * band of night at 3000px/s and up. With no lag, the hold's slack keeps every hand-off brand to brand.
 */
const REEL_SCRUB = true;

/** Seconds for the one-shot flood in flow mode. */
const FLOW_FLOOD_S = 0.7;

/** The clip insets measure() writes on the stage (work.css reads them on the layer and the spill). */
const INSET_VARS = ["--ct", "--cr", "--cb", "--cl"] as const;

/** The state attributes a scene writes on its article (work.css styles them). */
const STATE_ATTRS = ["data-covered", "data-unlit"] as const;

/** Untouched pieces: what a scene starts from and leaves behind. */
const NO_FADES: ReelFades = { text: 1, chips: 1, screen: 1 };

/**
 * cinema: sticky stages overlapping per Ruling R26, every phase scrubbed to scroll. phone: the same
 * scene on phones and portrait tablets (MQ.phoneCinema), on the phone layout and reelPhoneGeometry().
 * flow: landscape phones and short screens, a one-shot flood when the screen reaches the viewport's
 * centre. reduced: pre-flooded, everything instant.
 */
type ReelMode = "cinema" | "phone" | "flow" | "reduced";

/**
 * On <html> while the phone layout could not fit a reel on one screen, which hands the reels back to
 * the flow layout (the phone-cinema variant in globals.css leaves it out).
 */
const FLOW_FALLBACK_ATTR = "data-reels-flow";

/** The scrubbed 0 → 1 phases, each a registered custom property on the layer and the spill. */
type Phase = "--lit" | "--flood" | "--unflood";

interface Reel {
  /** Position in PROJECTS (its reelScreens signal). */
  index: number;
  slug: ReelSlug;
  article: HTMLElement;
  stage: HTMLElement;
  layer: HTMLElement;
  spill: HTMLElement;
  frame: HTMLElement;
  /** The elements every phase tween writes on: the layer, the spill and (cinema) the edge. */
  targets: HTMLElement[];
  /** The pieces reelFades() fades (reel.tsx and reel-screen.tsx mark them). */
  texts: HTMLElement[];
  chips: HTMLElement | null;
  screen: HTMLElement | null;
  /** The logo plate, measured into the lit box. */
  logo: HTMLElement | null;
  /** The brand surface shown around the lit screen, in px. */
  bezel: number;
  /** The opacities last written on those pieces. */
  fades: ReelFades;
  geometry: ReelGeometry;
  /** The re-cast title (data-typecast); direct() casts every reel's title together (createCasts). */
  title: HTMLElement | null;
  cast: Cast | null;
  lit: number;
  flood: number;
  unflood: number;
  /** The article spans the viewport's top line. */
  inside: boolean;
  /** Cinema: the next reel has fully flooded over it. */
  covered: boolean;
  /** Cinema: its screen has not fully lit up yet. */
  unlit: boolean;
  castOn: boolean;
  /** Lands the reel flooded at once: cinema jumps to its landing, flow finishes the one-shot. */
  reveal: (() => void) | null;
  /** Flow: fires the one-shot flood (at once when landing or jumping). */
  fire: ((self: ScrollTrigger) => void) | null;
}

function reelMode({ reduced, cinema, phoneCinema }: SceneFlags): ReelMode {
  if (reduced) return "reduced";
  if (cinema) return "cinema";
  return phoneCinema ? "phone" : "flow";
}

/**
 * The last two scroll positions, for scrollJump(); passive, and only while a scene runs. A capture
 * listener, so it reads scrollY before ScrollTrigger's scroll handler (on window, bubbling) has written
 * this scroll's phases: read after those writes, scrollY forces a style and layout pass.
 */
function recordScroll(): { record: ScrollRecord; stop: () => void } {
  const record: ScrollRecord = { previous: window.scrollY, last: window.scrollY };
  const listener = { passive: true, capture: true } as const;
  const onScroll = () => {
    record.previous = record.last;
    record.last = window.scrollY;
  };
  window.addEventListener("scroll", onScroll, listener);
  return { record, stop: () => window.removeEventListener("scroll", onScroll, listener) };
}

function readReel(article: HTMLElement, total: number, mode: ReelMode): Reel | null {
  const stage = article.querySelector<HTMLElement>("[data-reel-stage]");
  const layer = article.querySelector<HTMLElement>("[data-reel-layer]");
  const spill = article.querySelector<HTMLElement>("[data-reel-spill]");
  const frame = article.querySelector<HTMLElement>("[data-reel-frame]");
  const edge = article.querySelector<HTMLElement>("[data-reel-edge]");
  const title = article.querySelector<HTMLElement>("[data-typecast]");
  const index = Number(article.dataset.reelIndex);
  if (!stage || !layer || !spill || !frame || !Number.isInteger(index)) return null;
  const cinema = mode === "cinema" || mode === "phone";
  return {
    index,
    slug: article.dataset.reel as ReelSlug,
    article,
    stage,
    layer,
    spill,
    frame,
    targets: edge ? [layer, spill, edge] : [layer, spill],
    texts: Array.from(article.querySelectorAll<HTMLElement>("[data-reel-text]")),
    chips: article.querySelector<HTMLElement>("[data-reel-chips]"),
    screen: article.querySelector<HTMLElement>("[data-reel-screen]"),
    logo: article.querySelector<HTMLElement>("[data-reel-logo]"),
    bezel: mode === "phone" ? PHONE_BEZEL_PX : SCREEN_BEZEL_PX,
    fades: NO_FADES,
    geometry: mode === "phone" ? reelPhoneGeometry(index, total) : reelGeometry(index, total),
    title,
    cast: null,
    // The states the phase tweens render first: in cinema every stage but the first rises unlit.
    lit: cinema && index > 0 ? 0 : 1,
    flood: mode === "reduced" ? 1 : 0,
    unflood: 0,
    inside: false,
    covered: false,
    unlit: false,
    castOn: false,
    reveal: null,
    fire: null,
  };
}

/** The clip insets that show only the lit screen and its logo plate, written on the stage. */
function measure(reel: Reel): void {
  const screen = litBox(reel.frame.getBoundingClientRect(), reel.logo?.getBoundingClientRect() ?? null);
  const { top, right, bottom, left } = clipInsets(reel.layer.getBoundingClientRect(), screen, reel.bezel);
  const values = [top, right, bottom, left];
  INSET_VARS.forEach((name, i) => reel.stage.style.setProperty(name, `${values[i]}px`));
}

/** One opacity on a few elements; 1 clears it. */
function setOpacity(elements: readonly (HTMLElement | null)[], value: number): void {
  const css = value >= 1 ? "" : value.toFixed(3);
  for (const element of elements) if (element) element.style.opacity = css;
}

/** Writes only the fades that changed since the last frame. */
function applyFades(reel: Reel, next: ReelFades): void {
  const { fades } = reel;
  if (next.text !== fades.text) setOpacity(reel.texts, next.text);
  if (next.chips !== fades.chips) setOpacity([reel.chips], next.chips);
  if (next.screen !== fades.screen) setOpacity([reel.screen], next.screen);
  reel.fades = next;
}

function setFlag(reel: Reel, flag: "covered" | "unlit", value: boolean): void {
  if (reel[flag] === value) return;
  reel[flag] = value;
  reel.article.toggleAttribute(`data-${flag}`, value);
}

/** The "+N" summary at the end of a stack (reel.tsx) and the chip inside it that shows the count. */
function chipSummary(list: HTMLElement): { more: HTMLElement; count: HTMLElement } | null {
  const more = list.querySelector<HTMLElement>("[data-chip-more]");
  const count = more?.firstElementChild;
  return more && count instanceof HTMLElement ? { more, count } : null;
}

/** Every chip back in sight and the summary hidden. */
function unfitChips(list: HTMLElement): void {
  for (const item of list.querySelectorAll("[data-chip]")) item.removeAttribute("data-over");
  const summary = chipSummary(list);
  if (!summary) return;
  summary.more.hidden = true;
  delete summary.count.dataset.count;
}

/**
 * Phone: keeps a stack on one line. The chips past its end (leaving room for the summary) move out of
 * sight but are still read out (data-over, work.css), and the "+N" summary counts them. Only widths
 * are read and written, so no trigger moves.
 */
function fitChips(list: HTMLElement): void {
  unfitChips(list);
  const summary = chipSummary(list);
  const items = Array.from(list.querySelectorAll<HTMLElement>("[data-chip]"));
  const box = list.getBoundingClientRect();
  const ends = items.map((item) => item.getBoundingClientRect().right - box.left);
  if (!summary || ends.length === 0 || ends[ends.length - 1] <= box.width) return;
  summary.count.dataset.count = String(items.length);
  summary.more.hidden = false;
  const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
  const room = box.width - summary.more.getBoundingClientRect().width - gap;
  const shown = Math.max(1, ends.filter((end) => end <= room).length);
  for (const item of items.slice(shown)) item.setAttribute("data-over", "");
  summary.count.dataset.count = String(items.length - shown);
}

/**
 * Every reel's scene inside `root`, directed together because the hand-offs couple neighbours: a
 * reel is covered once the next one has flooded, its screen share falls as the next one lights up,
 * and reelStore.active is the latest reel that owns the room.
 */
function direct(root: HTMLElement, mode: ReelMode): () => void {
  const articles = Array.from(root.querySelectorAll<HTMLElement>("article[data-reel]"));
  const reels = articles.flatMap((article) => readReel(article, articles.length, mode) ?? []);
  const titled = reels.flatMap((reel) => (reel.title ? [{ reel, title: reel.title }] : []));
  const casts = createCasts(titled.map(({ title }) => title), { reduced: mode === "reduced" });
  titled.forEach(({ reel }, i) => {
    reel.cast = casts[i];
  });
  const scroll = mode === "reduced" ? null : recordScroll();
  const scrubbed: ScrollTrigger[] = [];
  // The phone showcase runs the cinema scene, on its own geometry and bezel (readReel).
  const cinema = mode === "cinema" || mode === "phone";
  /** True while a change must land settled rather than animate: building, a jump, a focus reveal. */
  let landing = true;
  let roomFlooded: boolean | null = null;

  const update = () => {
    let active: ReelSlug | null = null;
    let flooded = false;
    reels.forEach((reel, i) => {
      const next = reels[i + 1];
      setFlag(reel, "covered", cinema && next !== undefined && next.flood >= 1);
      setFlag(reel, "unlit", cinema && reel.lit < 1);
      const open = reel.flood * (1 - reel.unflood);
      if (open >= 1 && !reel.castOn) {
        reel.castOn = true;
        reel.cast?.toBrand(landing);
      } else if (open < FLOOD_ACTIVE && reel.castOn) {
        reel.castOn = false;
        reel.cast?.toNight();
      }
      const shown = reel.inside && !reel.covered;
      // A later reel overrides an earlier one: in cinema several articles span the top line at once.
      if (shown && (!cinema || open >= FLOOD_ACTIVE)) active = reel.slug;
      if (cinema && shown && open >= 1) flooded = true;
      const nextLit = cinema ? (next?.lit ?? 0) : 0;
      const share = cinema ? (reel.covered ? 0 : reel.lit * (1 - nextLit)) : 1;
      // Cinema shows reel 1's spill, and the last reel's while it un-floods (work.css).
      const spill = !cinema || reel.index === 0 || reel.unflood > 0;
      reelScreens.set(reel.index, { share, flood: open, spill });
      applyFades(reel, reelFades(open, nextLit, cinema ? (next?.flood ?? 0) : 0));
    });
    reelStore.set({ active });
    // Mirrored on Work's root for CSS and QA probes.
    if ((root.dataset.activeReel ?? null) !== active) {
      if (active) root.dataset.activeReel = active;
      else delete root.dataset.activeReel;
    }
    if (flooded !== roomFlooded) {
      roomFlooded = flooded;
      atmosphere.setCovered(flooded);
    }
  };

  const setPhase = (reel: Reel, phase: Phase, value: number) => {
    if (phase === "--lit") reel.lit = value;
    else if (phase === "--flood") reel.flood = value;
    else reel.unflood = value;
    if (phase !== "--lit" && value > 0 && value < 1) noteFlood();
    update();
  };

  // The viewport's height for isJump, kept from resize events: read inside a scrub's update, after the
  // phases before it had written theirs, innerHeight forced a style and layout pass on every frame.
  let viewportHeight = window.innerHeight;
  const onResize = () => {
    viewportHeight = window.innerHeight;
  };
  window.addEventListener("resize", onResize, { passive: true });

  const isJump = (self: ScrollTrigger) =>
    scroll !== null &&
    isTeleport({
      jump: scrollJump(self.scroll(), scroll.record),
      velocity: self.getVelocity(),
      viewportHeight,
    });

  /**
   * Snaps a phase to the trigger's scroll progress. The phases scrub with no smoothing, so this only
   * matters for a render the trigger has not caught up with yet (building, a jump, a focus reveal),
   * where it also makes the casts land instantly.
   */
  const settle = (self: ScrollTrigger) => {
    const wasLanding = landing;
    landing = true;
    self.animation?.progress(self.progress);
    landing = wasLanding;
  };

  const settleAll = () => {
    const wasLanding = landing;
    landing = true;
    for (const trigger of scrubbed) settle(trigger);
    update();
    landing = wasLanding;
  };

  /**
   * px of scroll from svh. On the desktop screens cinema runs on, 100svh is the root's client height
   * (the stage itself bleeds 1px past each edge, so it is not the measure). The phone stage is 100lvh,
   * so there it is the height of a reel's zone, the 100svh the reel is laid out in (work.css).
   */
  const zone = mode === "phone" ? root.querySelector<HTMLElement>("[data-reel-zone]") : null;
  const viewport = () => zone?.getBoundingClientRect().height ?? document.documentElement.clientHeight;
  const px = (svh: number) => svhToPx(svh, viewport());

  /** One phase scrubbed between two scroll offsets below the article's top. */
  const scrub = (reel: Reel, phase: Phase, start: () => number, end: () => number, onRefresh?: () => void) => {
    // fromTo renders its start (and calls onUpdate) before it returns, hence the late binding.
    let tween: gsap.core.Tween | null = null;
    tween = gsap.fromTo(
      reel.targets,
      { [phase]: 0 },
      { [phase]: 1, ease: "none", paused: true, onUpdate: () => setPhase(reel, phase, tween?.progress() ?? 0) },
    );
    const trigger = ScrollTrigger.create({
      animation: tween,
      trigger: reel.article,
      start: () => `top+=${start()} top`,
      end: () => `top+=${end()} top`,
      scrub: REEL_SCRUB,
      onRefresh,
      onUpdate: (self) => {
        if (landing || isJump(self)) settle(self);
      },
    });
    scrubbed.push(trigger);
    return trigger;
  };

  const buildCinema = (reel: Reel) => {
    const { light, landing: land, dwell, unflood } = reel.geometry;
    measure(reel);
    // Reels 2… rise unlit over the stuck reel, then their screen lights up in place once stuck.
    if (light > 0) scrub(reel, "--lit", () => 0, () => px(light));
    const flood = scrub(
      reel,
      "--flood",
      () => px(light),
      () => floodEndPx(land, viewport()),
      () => measure(reel),
    );
    // The last reel hands the room back to the night: room → small screen, then it scrolls away.
    if (unflood > 0) scrub(reel, "--unflood", () => px(land + dwell), () => px(land + dwell + unflood));
    reel.reveal = () => {
      // The flood's end, as an absolute offset rather than the element: the browser has already
      // scrolled the focused control into view, and Lenis resolves an element against its own
      // position, which only catches up with that native scroll on the next scroll event.
      scrollToTarget(flood.end, { mode: "instant" });
      ScrollTrigger.update();
      settleAll();
    };
  };

  const buildFlow = (reel: Reel) => {
    measure(reel);
    let oneShot: gsap.core.Tween | null = null;
    oneShot = gsap.fromTo(
      reel.targets,
      { "--flood": 0 },
      {
        "--flood": 1,
        duration: FLOW_FLOOD_S,
        ease: "dolly",
        paused: true,
        onUpdate: () => setPhase(reel, "--flood", oneShot?.ratio ?? 0),
      },
    );
    let fired = false;
    const complete = () => {
      fired = true;
      const wasLanding = landing;
      landing = true;
      oneShot?.progress(1);
      landing = wasLanding;
    };
    reel.fire = (self) => {
      if (fired) return;
      if (landing || isJump(self)) {
        complete();
        return;
      }
      fired = true;
      oneShot?.play();
    };
    ScrollTrigger.create({
      trigger: reel.frame,
      start: "center center",
      once: true,
      onRefresh: () => measure(reel),
      onEnter: (self) => reel.fire?.(self),
    });
    reel.reveal = complete;
  };

  // Phone: each stack on one line, refitted whenever the triggers are re-measured (a resize).
  const chipLists = mode === "phone" ? reels.flatMap((reel) => reel.chips ?? []) : [];
  const fitAllChips = () => chipLists.forEach(fitChips);
  fitAllChips();
  if (chipLists.length > 0) ScrollTrigger.addEventListener("refresh", fitAllChips);

  for (const reel of reels) {
    if (cinema) buildCinema(reel);
    else if (mode === "flow") buildFlow(reel);

    // Inside while the article spans the viewport's top line (1px in, so a jump that lands the
    // article exactly at its scroll-margin counts). In flow, reaching that line also floods a reel
    // whose screen has not reached the centre yet (a short screen, or a #reel-… link).
    ScrollTrigger.create({
      trigger: reel.article,
      start: "top top+=1",
      end: "bottom top+=1",
      onToggle: (self) => {
        reel.inside = self.isActive;
        update();
        if (reel.inside) reel.fire?.(self);
      },
    });
  }

  if (mode !== "reduced" && reels[0]) atmosphere.trackScreen(reels[0].frame);

  // Keyboard focus inside a reel that is unlit, unflooded, covered, un-flooding or being covered by
  // the next one lands it flooded, so the focus ring is never clipped away or hidden (WCAG 2.4.11).
  // Pointer focus (the pause button) never jumps the page.
  const focusHandlers = reels.map((reel, i) => {
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(":focus-visible")) return;
      const nextLit = cinema ? (reels[i + 1]?.lit ?? 0) : 0;
      const obscured = reel.flood < 1 || reel.lit < 1 || reel.unflood > 0 || reel.covered || nextLit > 0;
      if (obscured) reel.reveal?.();
    };
    reel.article.addEventListener("focusin", onFocusIn);
    return () => reel.article.removeEventListener("focusin", onFocusIn);
  });

  // Land the page where it loaded (at a #reel-… hash, or re-laid out mid-Work): every phase at its
  // scroll position with no catch-up, and the titles already cast. Then the stages may paint
  // (work.css hides them in cinema until now). The mark stays through rebuilds, which settle again
  // before the next paint.
  settleAll();
  landing = false;
  root.toggleAttribute("data-directed", true);

  return () => {
    scroll?.stop();
    window.removeEventListener("resize", onResize);
    for (const stop of focusHandlers) stop();
    if (chipLists.length > 0) ScrollTrigger.removeEventListener("refresh", fitAllChips);
    chipLists.forEach(unfitChips);
    for (const reel of reels) {
      reel.cast?.revert();
      for (const name of INSET_VARS) reel.stage.style.removeProperty(name);
      for (const name of STATE_ATTRS) reel.article.removeAttribute(name);
      applyFades(reel, NO_FADES);
      reelScreens.reset(reel.index);
    }
    reelStore.set({ active: null });
    delete root.dataset.activeReel;
    atmosphere.setCovered(false);
    atmosphere.trackScreen(null);
  };
}

/**
 * Whether the phone layout holds every reel inside its one-screen zone: the copy (the zone's last
 * child) ends above the zone's foot. Checked as the phone scene builds, on the laid-out page.
 */
function phoneFits(root: HTMLElement): boolean {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-reel-zone]")).every((zone) => {
    const copy = zone.lastElementChild;
    return !copy || copy.getBoundingClientRect().bottom <= zone.getBoundingClientRect().bottom + 1;
  });
}

/**
 * A reel too tall for one phone screen (a large text setting): marks <html> so the phone-cinema
 * variant lets go and the reels lay out as flow, directs them as flow, and re-measures every trigger on
 * the page (Work's height changed). Undone with the scene, so the next build checks again.
 */
function directFlowFallback(root: HTMLElement): () => void {
  const html = document.documentElement;
  html.toggleAttribute(FLOW_FALLBACK_ATTR, true);
  requestRefresh();
  const stop = direct(root, "flow");
  return () => {
    stop();
    html.removeAttribute(FLOW_FALLBACK_ATTR);
    requestRefresh();
  };
}

/**
 * The reels' scenes, for every article[data-reel] inside `scope`, rebuilt by useMotionScene whenever
 * the mode changes (a breakpoint or the reduced-motion setting):
 * - phone (MQ.phoneCinema): the cinema scene below on the phone layout, one reel per screen, with the
 *   REEL_PHONE_* phases (reelPhoneGeometry); flow instead should a reel not fit one screen.
 * - cinema (Ruling R26, geometry in flood.ts): reel 1 rises as a small lit screen out of the night,
 *   sticks, and its room floods (--flood 0 → 1 widens the brand layer's clip from the screen to the
 *   stage), then dwells. Each later reel rises unlit over the stuck one, sticks, lights up in place
 *   at the same screen position (--lit), floods over it and dwells; the covered reel is hidden. The
 *   last reel un-floods (--unflood) back to its small screen before it scrolls away.
 * - flow: a one-shot 700ms flood once the screen's centre reaches the viewport's centre.
 * - reduced: nothing moves; every reel stays flooded (the CSS default) and its title is cast at once.
 * In every mode the title is cast to the brand preset when the flood completes and back below
 * FLOOD_ACTIVE; reelStore.active is the reel that owns the room (cinema: flood ≥ 0.95 and not covered;
 * flow and reduced: the reel under the viewport's top line; null outside Work); reelScreens tells the
 * screens which one is seen; and a jump into a reel lands flooded and cast, with no catch-up.
 */
export function useReelScenes(scope: RefObject<HTMLElement | null>): void {
  useMotionScene(scope, (flags) => {
    const root = scope.current;
    if (!root) return;
    const mode = reelMode(flags);
    if (mode !== "phone" || phoneFits(root)) return direct(root, mode);
    return directFlowFallback(root);
  });
}
