"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

import { useStore } from "@/lib/hooks/useStore";
import { motionStore, readUserPref } from "@/lib/motion/state";

import type { AnimationEvent } from "react";
import type { CssVars } from "@/lib/types";

import { prefersReducedMotion } from "@/lib/dom";
import { PORTRAIT } from "@/lib/generated/portrait";

/** How long the x-ray strip and the photo get to decode before the develop is skipped. */
const DECODE_DEADLINE_MS = 1200;
/** Time in colour before the x-ray re-exposes the photo, while the face is on screen (Wayne's W7/W9). */
const CYCLE_MS = 2000;
/** If an animationend never arrives (a hidden tab, a missed event), the phase moves on anyway. */
const PHASE_FAILSAFE_MS = 1500;
/** The share of the head that must be on screen for the loop and the float to run. */
const ON_SCREEN_RATIO = 0.5;

/** The bust's CSS width: 1.897 head heights (see hero.css), capped by the head's clamp on desktop. */
const PHOTO_SIZES = "(min-width: 1024px) min(50vw, 874px), min(106vw, 570px)";

/** hold: first paint on the coarse frame 0 · develop: coarse → fine → colour · rest: colour · out: fine → coarse · in: coarse → fine. */
type Phase = "hold" | "develop" | "rest" | "out" | "in";

/** The phase after an animated one ends (out → in → rest, develop → rest). */
const NEXT_PHASE: Partial<Record<Phase, Phase>> = { develop: "rest", out: "in", in: "rest" };

const percent = (part: number, whole: number): string => `${(part / whole) * 100}%`;

/** The bust is the photo's own box: the rig origin (see hero.css .hero-rig). */
const BUST_STYLE: CssVars = { "--bx": 0, "--by": 0, "--bw": PORTRAIT.width, "--bh": PORTRAIT.height };

const XRAY_STYLE: CssVars = {
  "--sprite": `url("${PORTRAIT.xray.src}")`,
  "--frame0": `url("${PORTRAIT.xray.frame0}")`,
  "--frames": PORTRAIT.xray.frames,
  "--x": percent(PORTRAIT.xray.box.x, PORTRAIT.width),
  "--y": percent(PORTRAIT.xray.box.y, PORTRAIT.height),
  "--w": percent(PORTRAIT.xray.box.w, PORTRAIT.width),
  "--h": percent(PORTRAIT.xray.box.h, PORTRAIT.height),
};

/** The pause control covers the head (crown to chin, ear to ear). */
const HEAD_STYLE: CssVars = {
  "--x": percent(PORTRAIT.head.x, PORTRAIT.width),
  "--y": percent(PORTRAIT.head.y, PORTRAIT.height),
  "--w": percent(PORTRAIT.head.w, PORTRAIT.width),
  "--h": percent(PORTRAIT.head.h, PORTRAIT.height),
};

/** Reduced motion, read live: motionStore syncs only after the first effects run. */
const isReduced = (storeReduced: boolean): boolean => storeReduced || prefersReducedMotion() || readUserPref() === "off";

/**
 * The hero bust: Wayne's photo, with its x-ray. First paint holds on the coarse 1-bit frame 0 (an inline
 * data URI, so no request); once the strip and the photo decode, the x-ray resolves coarse → fine and
 * fades to the colour photo, the resting state. While half the face is on screen and the tab visible, the
 * photo re-exposes every CYCLE_MS (fine → coarse → fine → colour) and floats (a slow CSS bob). The
 * button over the head pauses and resumes both (WCAG 2.2.2). Reduced motion shows the colour photo at
 * once and nothing moves (the button is inert then). HeroMotion moves the whole bust for the parallax.
 */
export function HeroPortrait() {
  preload(PORTRAIT.photo.fallback.replace(".webp", ".avif"), {
    as: "image",
    type: "image/avif",
    imageSrcSet: PORTRAIT.photo.avif,
    imageSizes: PHOTO_SIZES,
    fetchPriority: "high",
  });

  const headRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const xrayRef = useRef<HTMLSpanElement>(null);
  const storeReduced = useStore(motionStore, (state) => state.reduced);
  const [phase, setPhase] = useState<Phase>("hold");
  const [playing, setPlaying] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const live = playing && onScreen && tabVisible && !storeReduced;

  // Develop once the strip and the photo decode (or skip to rest on a timeout, a failure or reduced motion).
  useEffect(() => {
    if (phase !== "hold" || isReduced(storeReduced)) return;
    // A slow hydration: once the CSS failsafe has faded frame 0 over the colour photo, developing
    // would bring the x-ray back, so the portrait just rests (the loop brings the next exposure).
    const failsafeFired = () => {
      const xray = xrayRef.current;
      return xray !== null && Number(getComputedStyle(xray).opacity) < 1;
    };
    let settled = false;
    const settle = (next: Phase) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(deadline);
      setPhase(next === "develop" && failsafeFired() ? "rest" : next);
    };
    const deadline = window.setTimeout(() => settle("rest"), DECODE_DEADLINE_MS);
    const strip = new Image();
    strip.src = PORTRAIT.xray.src;
    Promise.all([strip.decode(), photoRef.current?.decode()]).then(
      () => settle("develop"),
      () => settle("rest"),
    );
    return () => {
      settled = true;
      window.clearTimeout(deadline);
    };
  }, [phase, storeReduced]);

  // The loop and the float only run while at least half the face is on screen and the tab is visible.
  // (isIntersecting alone is true for any overlap in Firefox, so the ratio decides.)
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio >= ON_SCREEN_RATIO),
      { threshold: [0, ON_SCREEN_RATIO] },
    );
    observer.observe(head);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (phase !== "rest" || !live || isReduced(storeReduced)) return;
    const timer = window.setTimeout(() => setPhase("out"), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, live, storeReduced]);

  // Failsafe: every animated phase ends within PHASE_FAILSAFE_MS even if animationend never fires.
  useEffect(() => {
    const next = NEXT_PHASE[phase];
    if (!next) return;
    const timer = window.setTimeout(() => setPhase(next), PHASE_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const onAnimationEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    const next = NEXT_PHASE[phase];
    if (next && event.animationName.startsWith("hero-xray-")) setPhase(next);
  };

  // Under reduced motion the portrait never leaves hold, but shows (and styles) the resting photo.
  const shown: Phase = phase === "hold" && storeReduced ? "rest" : phase;

  return (
    <div
      data-hero-layer="bust"
      data-depth="5"
      data-phase={shown}
      data-float={live ? "" : undefined}
      className="hero-rig hero-bust"
      style={BUST_STYLE}
    >
      <div className="hero-float">
        <picture>
          <source type="image/avif" srcSet={PORTRAIT.photo.avif} sizes={PHOTO_SIZES} />
          <img
            ref={photoRef}
            src={PORTRAIT.photo.fallback}
            srcSet={PORTRAIT.photo.webp}
            sizes={PHOTO_SIZES}
            width={PORTRAIT.width}
            height={PORTRAIT.height}
            alt="Portrait of Wayne Rondina"
            fetchPriority="high"
            decoding="async"
            draggable={false}
            className="hero-photo"
          />
        </picture>
        <span ref={xrayRef} aria-hidden className="hero-xray" style={XRAY_STYLE} onAnimationEnd={onAnimationEnd} />
      </div>
      <button
        ref={headRef}
        type="button"
        aria-label={playing ? "Pause the portrait" : "Play the portrait"}
        inert={storeReduced}
        onClick={() => setPlaying((current) => !current)}
        className="hero-head"
        style={HEAD_STYLE}
      />
    </div>
  );
}
