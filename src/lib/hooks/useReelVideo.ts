import { useEffect, useRef, useState } from "react";

import { useStore } from "@/lib/hooks/useStore";
import { motionStore } from "@/lib/motion/state";

import type { RefObject } from "react";
import type { ReelMedia } from "@/lib/content";
import type { PlaybackState, PlayIntent, PoolEntry } from "@/lib/work/video-pool";

import { MQ } from "@/lib/motion/tokens";
import { reelScreens } from "@/lib/work/screens";
import { isPaused, pickArmed, pickSource, shouldPlay, toggleIntent } from "@/lib/work/video-pool";

/** A screen plays from this share of it on screen. */
const PLAY_RATIO = 0.6;

/**
 * …and while its scene share is above this: through the middle of a light-up's cross-dissolve both
 * screens keep playing, so neither freezes on screen.
 */
const PLAY_SHARE = 0.4;

/** IntersectionObserver steps, fine enough for pickArmed to rank two partly visible screens. */
const IO_THRESHOLDS = [0, 0.25, 0.5, PLAY_RATIO, 0.75, 1];

interface PoolMember extends PoolEntry {
  setArmed(armed: boolean): void;
}

// Every mounted screen, so pickArmed can keep at most two srcs attached across the page.
const pool = new Set<PoolMember>();
let lastScrollY = 0;
let scrollDirection: 1 | -1 = 1;

/** Capture: it runs before ScrollTrigger's own scroll handler (on window, bubbling). */
const SCROLL_LISTENER = { passive: true, capture: true } as const;

/**
 * The scroll direction pickArmed loads ahead in. It is read here, before ScrollTrigger's handler
 * writes the scenes' styles for this scroll: read from rebalancePool, which runs inside the scenes'
 * updates, scrollY forced a style and layout pass on every frame of a light-up or a flood.
 */
function trackDirection(): void {
  const y = window.scrollY;
  if (y === lastScrollY) return;
  scrollDirection = y > lastScrollY ? 1 : -1;
  lastScrollY = y;
}

function joinPool(member: PoolMember): void {
  if (pool.size === 0) {
    lastScrollY = window.scrollY;
    window.addEventListener("scroll", trackDirection, SCROLL_LISTENER);
  }
  pool.add(member);
}

function leavePool(member: PoolMember): void {
  pool.delete(member);
  if (pool.size === 0) window.removeEventListener("scroll", trackDirection, SCROLL_LISTENER);
}

function rebalancePool(): void {
  const armed = new Set(pickArmed([...pool], scrollDirection));
  for (const member of pool) member.setArmed(armed.has(member.index));
}

/** AV1 only when the browser is sure it can decode every AV1 rendition. */
function canPlayAv1(video: HTMLVideoElement, media: ReelMedia): boolean {
  const av1 = media.sources.filter((source) => source.codec === "av1");
  return av1.length > 0 && av1.every((source) => video.canPlayType(source.type) === "probably");
}

/** Plays, reporting a blocked autoplay (NotAllowedError); an interrupted load (AbortError) is harmless. */
function play(video: HTMLVideoElement, onBlocked: () => void): void {
  video.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "NotAllowedError") onBlocked();
  });
}

/** Attaches or detaches the one src, then plays or pauses to match the state. */
function applyPlayback(video: HTMLVideoElement | null, media: ReelMedia, state: PlaybackState, onBlocked: () => void): void {
  if (!video) return;
  const hasSrc = video.hasAttribute("src");
  if (state.armed && !hasSrc) {
    const src = pickSource(media, {
      mobile: window.matchMedia(MQ.mobileVideo).matches,
      canPlayAv1: canPlayAv1(video, media),
    });
    if (src) video.src = src;
  } else if (!state.armed && hasSrc) {
    // Dropping the src and calling load() aborts the download and frees the decoder.
    video.pause();
    video.removeAttribute("src");
    video.load();
    return;
  }
  if (shouldPlay(state) && video.hasAttribute("src")) {
    if (video.paused) play(video, onBlocked);
  } else if (!video.paused) {
    video.pause();
  }
}

interface Options {
  /** The reel's position in PROJECTS; pickArmed pairs a screen with its neighbour by it. */
  index: number;
  media: ReelMedia;
}

/**
 * Drives one reel screen's muted loop (preload="none"). Each clip's trim (the manifest's startAt)
 * is baked into the encodes, so every src plays from 0.
 * - The src is attached only while pickArmed picks the screen (the one being seen, plus the next in
 *   the scroll direction), so no video is requested before Work and at most two hold a src.
 * - What counts as seen is IntersectionObserver's ratio times the scene's share (reelScreens): in
 *   cinema the stages overlap, so a stage rising unlit, a screen the next reel has lit up over and
 *   a covered reel all count as unseen even though they intersect the viewport.
 * - It plays only while at least 60% of it is on screen and its share is above 0.4, and pauses once
 *   covered.
 * - The pause button's choice is sticky. Under reduced motion nothing autoplays, but the button
 *   still plays it; when motion becomes reduced, the video pauses. A blocked autoplay (e.g. Low Power
 *   Mode) shows the Play state, and the button's press plays it inside the user's gesture.
 * Returns the button's state and its handler.
 */
export function useReelVideo(
  frameRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  { index, media }: Options,
): { paused: boolean; toggle: () => void } {
  const reduced = useStore(motionStore, (state) => state.reduced);
  const [intent, setIntent] = useState<PlayIntent>("auto");
  const [intentReduced, setIntentReduced] = useState(reduced);
  // An explicit play under reduced motion lasts until the motion setting changes again.
  if (reduced !== intentReduced) {
    setIntentReduced(reduced);
    if (intent === "playing") setIntent("auto");
  }

  const playback = useRef<PlaybackState>({ intent, reduced, armed: false, visible: false });

  useEffect(() => {
    playback.current = { ...playback.current, intent, reduced };
    applyPlayback(videoRef.current, media, playback.current, () => setIntent("paused"));
  }, [intent, reduced, media, videoRef]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onBlocked = () => setIntent("paused");
    const sync = () => applyPlayback(videoRef.current, media, playback.current, onBlocked);
    let intersection = 0;
    const member: PoolMember = {
      index,
      ratio: 0,
      setArmed(armed) {
        if (playback.current.armed === armed) return;
        playback.current = { ...playback.current, armed };
        sync();
      },
    };
    const refresh = () => {
      const { share } = reelScreens.get(index);
      member.ratio = intersection * share;
      playback.current = { ...playback.current, visible: intersection >= PLAY_RATIO && share > PLAY_SHARE };
      rebalancePool();
      sync();
    };
    joinPool(member);

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersection = entry.isIntersecting ? entry.intersectionRatio : 0;
        refresh();
      },
      { threshold: IO_THRESHOLDS },
    );
    observer.observe(frame);
    const unsubscribe = reelScreens.subscribe(index, refresh);

    return () => {
      unsubscribe();
      observer.disconnect();
      leavePool(member);
      member.setArmed(false);
      rebalancePool();
    };
  }, [frameRef, videoRef, index, media]);

  const toggle = () => {
    const next = toggleIntent(intent, reduced);
    setIntent(next);
    // Resume inside the click itself, so a browser that blocked autoplay allows this play().
    const video = videoRef.current;
    const resume = !isPaused(next, reduced) && playback.current.visible;
    if (video && resume && video.hasAttribute("src") && video.paused) play(video, () => setIntent("paused"));
  };

  return { paused: isPaused(intent, reduced), toggle };
}
