// Motion tokens. globals.css mirrors EASE (--ease-*), DURATION (--dur-*) and the hero-pin, cinema and
// motion-off media queries; tokens.test.ts keeps the two in step.

export const EASE = { dolly: [0.65, 0, 0.15, 1], settle: [0.22, 1, 0.36, 1] } as const;

/** Seconds. */
export const DURATION = { micro: 0.18, ui: 0.42, regrade: 0.9, camera: 1.1 } as const;

export const SCRUB = 0.6;

export const LENIS_LERP = 0.085;

export const MQ = {
  heroPin: "(min-width: 1024px) and (min-height: 760px)",
  cinema: "(min-width: 1024px) and (min-height: 700px)",
  /**
   * Work's showcase on phones and portrait tablets (the `phone-cinema` variant in globals.css). Phone
   * browsers evaluate a height query against the small viewport (the initial containing block, which
   * the toolbar never resizes), so it does not flip while the toolbar collapses; shorter or landscape
   * screens keep the flow layout.
   */
  phoneCinema: "(max-width: 1023.98px) and (min-height: 600px) and (orientation: portrait)",
  smoothScroll: "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  finePointer: "(hover: hover) and (pointer: fine)",
  mobileVideo: "(max-width: 767px)",
  osReduce: "(prefers-reduced-motion: reduce)",
} as const;

/** The hero's pinned height (desktop): 100svh on screen plus the scroll the name's lateral move runs over. */
export const HERO_PIN_SVH = 170;

/**
 * Work's reel hand-off (Ruling R26), in svh of scroll. A reel's stage sticks, its small screen lights
 * up in place over REEL_LIGHT_SVH (reel 1 skips this: it rose visibly), the room floods over
 * FLOOD_HOLD_SVH (src/lib/work/flood.ts), then holds for REEL_DWELL_SVH. The last reel un-floods
 * over REEL_UNFLOOD_SVH. reelGeometry() in flood.ts derives article heights and overlaps from these.
 */
export const REEL_LIGHT_SVH = 10;

export const REEL_DWELL_SVH = 25;

export const REEL_UNFLOOD_SVH = 30;

/**
 * The same hand-off on phones (MQ.phoneCinema), in svh of scroll, run by reelPhoneGeometry() in
 * flood.ts: a quicker light-up and flood (a thumb covers a phone screen in a short swipe) and a
 * longer dwell, so each reel still gets a comfortable read.
 */
export const REEL_PHONE_LIGHT_SVH = 8;

export const REEL_PHONE_FLOOD_SVH = 30;

export const REEL_PHONE_DWELL_SVH = 32;

export const REEL_PHONE_UNFLOOD_SVH = 25;
