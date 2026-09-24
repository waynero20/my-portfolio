"use client";

import { useEffect, useRef } from "react";

import { useHeroParallax } from "@/lib/hooks/useHeroParallax";
import { useMotionScene } from "@/lib/hooks/useMotionScene";
import { atmosphere } from "@/lib/atmosphere";
import { gsap } from "@/lib/motion/gsap";

import type { ReactNode } from "react";

import { PORTRAIT } from "@/lib/generated/portrait";
import { SCRUB } from "@/lib/motion/tokens";

/**
 * How far the words travel, as a fraction of the frame's width (the viewport's, on phones). On
 * desktop WAYNE's travel is only the aim: wayneEnd fits its end to the head.
 */
const WORD_TRAVEL = { desktop: 0.3, phone: 0.42 } as const;

/**
 * The head's silhouette at WAYNE's cap line (0.14 head heights below the crown, hero.css
 * --wayne-top), as fractions of the head box's width, measured from face.png's alpha. It is the
 * narrowest the head gets across WAYNE's band; lower down it widens to the full box (ear to ear).
 */
const HEAD_AT_CAP_LINE = { left: 0.12, right: 0.87 } as const;
/** Slack for the bust's pointer parallax (data-depth 5) plus a pixel. */
const HIDE_MARGIN_PX = 6;
/** The share of the second-last letter that stays in front of the head at the end. */
const TUCKED_SHOWS = 0.55;

/**
 * Depth parallax over the same scroll, in head heights (--m): the bust drifts up a little (its body
 * dots ride it), the far dots lag and drift right, the near dots rise past the bust and drift left, so
 * the loose dots gather into him.
 */
const DEPTH = {
  bust: { x: 0, y: -0.08 },
  far: { x: 0.05, y: -0.02 },
  near: { x: -0.07, y: -0.2 },
} as const;

type Layer = keyof typeof DEPTH;

/** The opacity the near and far dots lose over the same scroll: the scatter thins out as he resolves. */
const THIN_OUT: Partial<Record<Layer, number>> = { far: 0.25, near: 0.45 };

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * WAYNE's end x on desktop, fitted to the head so the pin never releases on slivers of letters: the
 * last letter ends wholly behind the head (inside its silhouette at the cap line) and the one before
 * it still shows at least TUCKED_SHOWS of its width left of the head, as if tucking behind it. Of
 * that window, the x closest to `aim`. Measured at the words' layout positions, so the current
 * translate doesn't matter. If the last letter can't hide behind the head, `aim`.
 */
function wayneEnd(word: HTMLElement, bust: HTMLElement, aim: number): number {
  const text = word.firstChild;
  if (!(text instanceof Text) || text.length < 2) return aim;

  // A letter's span in .hero-name's coordinates: the word's layout offset plus the glyph's place in it.
  const wordLeft = word.getBoundingClientRect().left;
  const range = document.createRange();
  const span = (index: number): [number, number] => {
    range.setStart(text, index);
    range.setEnd(text, index + 1);
    const { left, right } = range.getBoundingClientRect();
    return [word.offsetLeft + left - wordLeft, word.offsetLeft + right - wordLeft];
  };
  const [lastStart, lastEnd] = span(text.length - 1);
  const [prevStart, prevEnd] = span(text.length - 2);

  const headLeft = bust.offsetLeft + (bust.offsetWidth * PORTRAIT.head.x) / PORTRAIT.width;
  const headWidth = (bust.offsetWidth * PORTRAIT.head.w) / PORTRAIT.width;
  const min = headLeft + HEAD_AT_CAP_LINE.left * headWidth + HIDE_MARGIN_PX - lastStart;
  const max = headLeft + HEAD_AT_CAP_LINE.right * headWidth - HIDE_MARGIN_PX - lastEnd;
  if (min > max) return aim;
  const tucked = headLeft - prevStart - TUCKED_SHOWS * (prevEnd - prevStart);
  return gsap.utils.clamp(min, Math.max(min, Math.min(max, tucked)), aim);
}

/**
 * The hero's stage and its scroll moves. Its children are the server-rendered cold open; it finds its
 * targets by data attribute. The pin itself is CSS (the hero-pin variant makes the section
 * HERO_PIN_SVH tall and this stage sticky), so the layout is the same before and after JS.
 * - WAYNE slides right, passing behind the bust, and ends with its last letter hidden behind the head
 *   (wayneEnd). RONDINA slides to the frame's centre over the first
 *   half, then on past its start to the left (phones: it starts centred, so it simply slides left).
 *   Transform only, at the words' resting width: no layout, no reflow.
 * - The bust and the dissolve's near and far dots drift at their own rates (DEPTH), and the loose dots
 *   thin out (THIN_OUT); fine pointers add a small pointer parallax on top (useHeroParallax). The
 *   bust's float is CSS (HeroPortrait).
 * - hero-pin screens scrub across the pin and drive the atmosphere; every other screen scrubs over
 *   the first 55svh of scroll. Both retract the letterbox.
 * - Reduced motion: nothing moves.
 */
export function HeroMotion({ children, className }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  useHeroParallax(stageRef);

  // will-change only while the stage is on screen (layers are promoted for the scrub, then released).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) stage.dataset.live = "";
      else delete stage.dataset.live;
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useMotionScene(stageRef, ({ reduced, desktop, heroPin }) => {
    const stage = stageRef.current;
    const section = stage?.parentElement;
    if (reduced || !stage || !section) return;

    const first = stage.querySelector<HTMLElement>('[data-hero-word="first"]');
    const last = stage.querySelector<HTMLElement>('[data-hero-word="last"]');
    const name = stage.querySelector<HTMLElement>(".hero-name");
    const bars = stage.querySelectorAll<HTMLElement>("[data-hero-bar]");
    if (!first || !last || !name) return;

    const layer = (id: Layer) => stage.querySelector<HTMLElement>(`[data-hero-layer="${id}"]`);
    // The head's CSS height (--m): the bust box is the whole photo, PORTRAIT.height source px tall.
    const headPx = () => ((layer("bust")?.offsetHeight ?? 0) * PORTRAIT.head.h) / PORTRAIT.height;
    const width = () => (desktop ? name.clientWidth : window.innerWidth);
    const travel = desktop ? WORD_TRAVEL.desktop : WORD_TRAVEL.phone;

    const timeline: gsap.core.Timeline = gsap.timeline({
      defaults: { ease: "none", duration: 1 },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: heroPin ? "bottom bottom" : "+=55%",
        scrub: SCRUB,
        invalidateOnRefresh: true,
      },
      onUpdate: heroPin ? () => atmosphere.setDolly(timeline.progress()) : undefined,
    });

    const bust = layer("bust");
    timeline.to(first, { x: () => (desktop && bust ? wayneEnd(first, bust, travel * width()) : travel * width()) }, 0);
    if (desktop) {
      // To the frame's centre, then on past its resting place to the left.
      timeline
        .to(last, { x: () => (name.clientWidth - last.offsetWidth) / 2 - last.offsetLeft, duration: 0.5 }, 0)
        .to(last, { x: () => -travel * width(), duration: 0.5 }, 0.5);
    } else {
      timeline.to(last, { x: () => -travel * width() }, 0);
    }

    for (const id of Object.keys(DEPTH) as Layer[]) {
      const target = layer(id);
      const thin = THIN_OUT[id];
      if (!target) continue;
      timeline.to(
        target,
        { x: () => DEPTH[id].x * headPx(), y: () => DEPTH[id].y * headPx(), ...(thin === undefined ? {} : { opacity: 1 - thin }) },
        0,
      );
    }
    // The letterbox retracts over the same scroll, pinned or not (unpinned, the bottom bar would
    // otherwise scroll up the screen as a black stripe).
    if (bars.length > 0) timeline.to(bars, { scaleY: 0 }, 0);

    return () => atmosphere.setDolly(0);
  });

  return (
    <div ref={stageRef} className={className}>
      {children}
    </div>
  );
}
