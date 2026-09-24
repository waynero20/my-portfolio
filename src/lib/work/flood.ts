// Pure maths behind the reel hand-off: how tall each reel's article is and how far it tucks under
// the previous one (Ruling R26), where the brand layer's clip starts, how the outgoing reel's pieces
// fade through a hand-off, and when a scroll is a jump (a reel link, a hero CTA, End, Find) that
// should land settled rather than animate.

import {
  REEL_DWELL_SVH,
  REEL_LIGHT_SVH,
  REEL_PHONE_DWELL_SVH,
  REEL_PHONE_FLOOD_SVH,
  REEL_PHONE_LIGHT_SVH,
  REEL_PHONE_UNFLOOD_SVH,
  REEL_UNFLOOD_SVH,
} from "@/lib/motion/tokens";

/** The brand surface shown around the lit screen before the flood. */
export const SCREEN_BEZEL_PX = 12;

/** The flood at which the reel owns the room: reelStore.active switches to it from here up. */
export const FLOOD_ACTIVE = 0.95;

/** svh of scroll over which a stuck reel's room floods out of its lit screen. */
export const FLOOD_HOLD_SVH = 35;

/**
 * One reel's cinema geometry, in svh of scroll (the stage is 100svh). Phases, from the moment the
 * article's top reaches the viewport's top and the stage sticks:
 *   light (L)   its small screen lights up in place, at the previous reel's screen position (0 for
 *               reel 1, which rose visibly out of the night instead);
 *   flood (F)   the room floods out of the screen;
 *   dwell (D)   the room holds for reading;
 *   unflood (U) last reel only: room → small screen → night, so Work is left dark to dark.
 * The next reel's article starts one step (light + F + D) below this one, so it sticks as this
 * dwell ends. Until then its stage rises invisibly (unlit) over this stuck one.
 *
 *   hold    = article height − 100svh = step + L + F + D (last: L + F + D + U)
 *   overlap = the article's negative margin-top = 100 + L + F + D (0 for reel 1)
 *   landing = light + F: a #reel-… jump lands where the flood completes (the cinema scroll-margin)
 *
 * A reel must stay stuck until the next one has fully flooded over it (step + L + F). The hold adds
 * the next reel's dwell on top as slack for the scrub's smoothing lag, so a fast scroll never
 * uncovers night below the outgoing stage. The slack costs no page height: every article still
 * starts one step after the previous one (hold + 100 − overlap = step). Once covered, a stage is
 * hidden (data-covered), so the extra stacked stages paint nothing.
 */
export interface ReelGeometry {
  light: number;
  flood: number;
  dwell: number;
  unflood: number;
  step: number;
  hold: number;
  overlap: number;
  landing: number;
}

export function reelGeometry(index: number, total: number): ReelGeometry {
  const first = index === 0;
  const last = index === total - 1;
  const light = first ? 0 : REEL_LIGHT_SVH;
  const step = light + FLOOD_HOLD_SVH + REEL_DWELL_SVH;
  const handOff = REEL_LIGHT_SVH + FLOOD_HOLD_SVH + REEL_DWELL_SVH;
  const unflood = last ? REEL_UNFLOOD_SVH : 0;
  return {
    light,
    flood: FLOOD_HOLD_SVH,
    dwell: REEL_DWELL_SVH,
    unflood,
    step,
    hold: last ? step + unflood : step + handOff,
    overlap: first ? 0 : 100 + handOff,
    landing: light + FLOOD_HOLD_SVH,
  };
}

/** The phone showcase's lit-screen bezel: its screen is nearly as wide as the phone. */
export const PHONE_BEZEL_PX = 8;

/**
 * reelGeometry() for the phone showcase (MQ.phoneCinema): the same R26 maths on the REEL_PHONE_*
 * phases. Its stage is 100lvh (so it still fills the screen once the toolbar collapses) with the reel
 * laid out in the top 100svh, so the article is 100lvh + hold and the overlap 100lvh + L + F + D.
 * Here `overlap` leaves the stage out, like `hold` (reel.tsx adds the 100lvh to both), so every
 * offset stays in svh, the unit the scene scrubs in, and a toolbar change never moves one.
 */
export function reelPhoneGeometry(index: number, total: number): ReelGeometry {
  const first = index === 0;
  const last = index === total - 1;
  const light = first ? 0 : REEL_PHONE_LIGHT_SVH;
  const step = light + REEL_PHONE_FLOOD_SVH + REEL_PHONE_DWELL_SVH;
  const handOff = REEL_PHONE_LIGHT_SVH + REEL_PHONE_FLOOD_SVH + REEL_PHONE_DWELL_SVH;
  const unflood = last ? REEL_PHONE_UNFLOOD_SVH : 0;
  return {
    light,
    flood: REEL_PHONE_FLOOD_SVH,
    dwell: REEL_PHONE_DWELL_SVH,
    unflood,
    step,
    hold: last ? step + unflood : step + handOff,
    overlap: first ? 0 : handOff,
    landing: light + REEL_PHONE_FLOOD_SVH,
  };
}

/** The outgoing reel's text columns rest at this opacity once the next room has begun to flood. */
export const RECEDE_OPACITY = 0.35;

/** The share of the next reel's flood over which the outgoing text recedes to RECEDE_OPACITY. */
const RECEDE_SPAN = 0.25;

/** The stack shows at this multiple of its own room's flood (fully by two thirds of it). */
const CHIPS_RATE = 1.5;

/** The outgoing screen switches off at this multiple of the next screen's --lit (gone by a third). */
const SWITCH_OFF_RATE = 3;

/** Opacities for a reel's marked pieces (reel.tsx), 1 being untouched. */
export interface ReelFades {
  /** The slate/title and copy columns (data-reel-text). */
  text: number;
  /** The stack under the screen (data-reel-chips). */
  chips: number;
  /** The whole screen (data-reel-screen): set wall, frame and logo plate. */
  screen: number;
}

/**
 * How a reel's pieces fade, from its own open-ness (flood × (1 − unflood)) and the next reel's
 * --lit and --flood (both 0 outside cinema or for the last reel):
 * - text recedes (ease-out, so most of it goes early) as the next room starts flooding over it, so
 *   the fragments either side of the moving rim never read as one spliced line;
 * - the stack appears with its own room (the lit screen's clip would otherwise slice it) and leaves
 *   with its screen as the next one lights up, so a new screen is never captioned with the
 *   previous stack;
 * - the screen switches off within the first third of the next screen's light-up (the next one
 *   switches on over its room's surface), so two recordings and two plates of different widths
 *   never double-expose for long.
 */
export function reelFades(open: number, nextLit: number, nextFlood: number): ReelFades {
  const recede = Math.min(1, Math.max(0, nextFlood) / RECEDE_SPAN);
  const eased = 1 - (1 - recede) ** 2;
  const screen = 1 - Math.min(1, Math.max(0, nextLit) * SWITCH_OFF_RATE);
  return {
    text: 1 - (1 - RECEDE_OPACITY) * eased,
    chips: Math.min(1, Math.max(0, open) * CHIPS_RATE) * screen,
    screen,
  };
}

/** svh of scroll → px, for a stage `stageHeight` px tall (100svh). */
export function svhToPx(svh: number, stageHeight: number): number {
  return (stageHeight * svh) / 100;
}

/**
 * The px offset (below the article's top) at which the flood completes: the landing, rounded down
 * and then one px shorter. A jump lands `landing` svh (unrounded) below the article's top and the
 * browser may round that down, so the flood still ends at or before the landing.
 */
export function floodEndPx(landing: number, stageHeight: number): number {
  return Math.max(1, Math.floor(svhToPx(landing, stageHeight)) - 1);
}

/**
 * A single update that moves the page more than this many viewports is a jump. Scrolling never
 * does (PageDown and Space move 87.5%).
 */
const TELEPORT_VIEWPORTS = 1;

/** A scroll faster than this (px/s) is a jump too. */
export const TELEPORT_VELOCITY = 8000;

/** The edges of a rect, as getBoundingClientRect() reports them. */
export interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The smallest box holding both (the lit screen plus its overhanging logo, so the clip never slices it). */
export function unionBox(a: Box, b: Box): Box {
  return {
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
    left: Math.min(a.left, b.left),
  };
}

/**
 * The lit screen: the frame grown evenly on every side by as far as the logo plate overhangs it, so
 * the plate is never sliced and the bezel around the screen stays even.
 */
export function litBox(frame: Box, logo: Box | null): Box {
  if (!logo) return frame;
  const { top, right, bottom, left } = unionBox(frame, logo);
  const overhang = Math.max(frame.top - top, right - frame.right, bottom - frame.bottom, frame.left - left);
  return {
    top: frame.top - overhang,
    right: frame.right + overhang,
    bottom: frame.bottom + overhang,
    left: frame.left - overhang,
  };
}

/**
 * The clip-path insets that show only the screen plus its bezel, measured from the clipped layer's
 * own edges (both rects from the same moment, so scrolling and sticky offsets cancel out). An inset
 * never goes below 0, so a full-bleed screen is clipped at the top and bottom only.
 */
export function clipInsets(layer: Box, screen: Box, bezel: number = SCREEN_BEZEL_PX): Box {
  return {
    top: Math.max(0, screen.top - layer.top - bezel),
    right: Math.max(0, layer.right - screen.right - bezel),
    bottom: Math.max(0, layer.bottom - screen.bottom - bezel),
    left: Math.max(0, screen.left - layer.left - bezel),
  };
}

/** The last two positions a passive scroll listener saw. */
export interface ScrollRecord {
  previous: number;
  last: number;
}

/**
 * How far the page moved in the scroll that is being handled. ScrollTrigger may run before or after
 * the listener for the same scroll: if the listener already recorded `now`, the move started from the
 * position before it.
 */
export function scrollJump(now: number, { previous, last }: ScrollRecord): number {
  return Math.abs(now - (now === last ? previous : last));
}

export interface ScrollMove {
  /** scrollJump() for this update, in px. */
  jump: number;
  /** ScrollTrigger's getVelocity(), in px/s. */
  velocity: number;
  viewportHeight: number;
}

/** A move of more than one viewport in one update, or a scroll faster than 8000px/s. */
export function isTeleport({ jump, velocity, viewportHeight }: ScrollMove): boolean {
  return jump > TELEPORT_VIEWPORTS * viewportHeight || Math.abs(velocity) > TELEPORT_VELOCITY;
}
