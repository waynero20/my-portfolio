import { useEffect } from "react";

import { atmosphere } from "@/lib/atmosphere";
import { loadAmbi, rgbToHex, roundRgb, sameRgb, sampleAmbi } from "@/lib/atmosphere/ambilight";

import type { RefObject } from "react";
import type { AmbiTrack, Rgb } from "@/lib/atmosphere/ambilight";
import type { ReelSlug } from "@/lib/types";

import { reelScreens } from "@/lib/work/screens";

const SPILL_VARS = ["--reel-spill-l", "--reel-spill-r"] as const;

/** The reel whose colours the atmosphere last received, so only it clears them. */
let ambientOwner: ReelSlug | null = null;

interface Options {
  /** Off under reduced motion and for "split" brands, which keep their static pair. */
  enabled: boolean;
  /**
   * The reel's frame. The pair is written on its stage's spill, the only element that reads it, so a
   * video frame restyles the spill alone rather than the whole reel.
   */
  target: RefObject<HTMLElement | null>;
  /** The reel's position in PROJECTS (its reelScreens signal). */
  index: number;
}

const rgbCss = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/**
 * Ambilight for one reel screen, and the page's only requestVideoFrameCallback loop. While the video
 * plays, its spill can show (reelScreens: cinema hides reels 2…'s spill except the last one's
 * un-flood) and its room has not fully flooded, each presented frame samples /ambi/{slug}.json at
 * the frame's mediaTime (interpolated between the 4fps samples), writes --reel-spill-l/-r on the
 * spill (skipping changes under 1/255) and passes the pair to atmosphere.setAmbient. The track is
 * fetched the first time that is wanted, not on mount. Paused, detached, hidden or flooded, the loop
 * stops and the last colours stay. With no track, no rVFC support or when disabled, the brand's
 * static pair (the [data-reel] tokens) shows.
 */
export function useAmbilight(
  videoRef: RefObject<HTMLVideoElement | null>,
  slug: ReelSlug,
  { enabled, target, index }: Options,
): void {
  useEffect(() => {
    const video = videoRef.current;
    const spill =
      target.current?.closest<HTMLElement>("[data-reel-stage]")?.querySelector<HTMLElement>("[data-reel-spill]") ?? null;
    if (!enabled || !video || !spill || typeof video.requestVideoFrameCallback !== "function") return;

    let track: AmbiTrack | null = null;
    let requested = false;
    let handle: number | null = null;
    let cancelled = false;
    let last: { l: Rgb; r: Rgb } | null = null;

    const write = (mediaTime: number) => {
      if (!track) return;
      const sample = sampleAmbi(track, mediaTime);
      const l = roundRgb(sample.l);
      const r = roundRgb(sample.r);
      if (last && sameRgb(last.l, l) && sameRgb(last.r, r)) return;
      last = { l, r };
      spill.style.setProperty(SPILL_VARS[0], rgbCss(l));
      spill.style.setProperty(SPILL_VARS[1], rgbCss(r));
      atmosphere.setAmbient(rgbToHex(l), rgbToHex(r));
      ambientOwner = slug;
    };

    const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
      handle = null;
      write(metadata.mediaTime);
      sync();
    };

    function sync(): void {
      if (!video) return;
      const { flood, spill } = reelScreens.get(index);
      const wanted = !video.paused && spill && flood < 1;
      if (wanted && !requested) {
        requested = true;
        void loadAmbi(slug).then((loaded) => {
          if (cancelled) return;
          track = loaded;
          sync();
        });
      }
      const run = wanted && track !== null;
      if (run && handle === null) handle = video.requestVideoFrameCallback(onFrame);
      else if (!run && handle !== null) {
        video.cancelVideoFrameCallback(handle);
        handle = null;
      }
    }

    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    const unsubscribe = reelScreens.subscribe(index, sync);
    sync();

    return () => {
      cancelled = true;
      unsubscribe();
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
      if (handle !== null) video.cancelVideoFrameCallback(handle);
      for (const name of SPILL_VARS) spill.style.removeProperty(name);
      if (ambientOwner === slug) {
        atmosphere.setAmbient(null);
        ambientOwner = null;
      }
    };
  }, [enabled, index, slug, target, videoRef]);
}
