"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { useAmbilight } from "@/lib/hooks/useAmbilight";
import { useReelVideo } from "@/lib/hooks/useReelVideo";
import { useStore } from "@/lib/hooks/useStore";
import { motionStore } from "@/lib/motion/state";

import type { ReelMedia } from "@/lib/content";
import type { CssVars, Project, ReelSlug, ReelTheme } from "@/lib/types";

import { cn } from "@/lib/utils";

/** The screen is the 7/12 column from lg up and full-bleed below md. */
const SCREEN_SIZES = "(min-width: 1024px) 58vw, 100vw";

/** A contain recording (a wider page) is letterboxed in the 16:10 frame on the brand surface. */
const FIT_CLASS = { cover: "object-cover object-top", contain: "object-contain object-center" } as const;

const BLEND_CLASS = { multiply: "mix-blend-multiply", screen: "mix-blend-screen" } as const;

interface Props {
  /** The reel's position in PROJECTS. */
  index: number;
  slug: ReelSlug;
  title: string;
  media: ReelMedia;
  logo: Project["logo"];
  overlay: Project["overlay"];
  spillMode: ReelTheme["spillMode"];
}

/**
 * The reel's lit screen: a 16:10 frame (data-reel-frame, which the flood clips to) holding a
 * <picture> poster and the muted loop, with a pause button (WCAG 2.2.2). The client's logo sits on
 * a plate overhanging the frame's bottom-left corner like a lower third (data-reel-logo: the clip
 * includes it); the top-left is where most recordings carry their own header mark, which the plate
 * would only double. In the phone showcase (phone-cinema) the plate sits inside that corner instead, so
 * the lit screen spans nearly the phone's width with no room kept for an overhang, and the screen takes
 * the width the zone gives it (--ph-screen-w, work.css). The overlay photo is the "set wall" behind it,
 * blended into the brand surface. useReelVideo decides
 * when the video gets its src and when it plays; useAmbilight spills its live edge colours.
 */
export function ReelScreen({ index, slug, title, media, logo, overlay, spillMode }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = useStore(motionStore, (state) => state.reduced);
  const { paused, toggle } = useReelVideo(frameRef, videoRef, { index, media });
  useAmbilight(videoRef, slug, { enabled: !reduced && spillMode === "ambilight", target: frameRef, index });
  const { posters } = media;
  const fit = FIT_CLASS[media.fit];
  const wallStyle: CssVars = { "--wall-opacity": overlay.opacity };
  const logoStyle: CssVars = { "--logo-zoom": logo.zoom ?? 1 };

  return (
    <div data-reel-screen="" className="relative phone-cinema:mx-auto phone-cinema:w-(--ph-screen-w)">
      <div
        aria-hidden
        className={cn(
          "reel-set-wall pointer-events-none absolute -inset-x-8 -inset-y-12 opacity-(--wall-opacity) lg:-inset-x-12 lg:-inset-y-16",
          BLEND_CLASS[overlay.blend],
        )}
        style={wallStyle}
      >
        <Image src={overlay.src} alt="" fill sizes={SCREEN_SIZES} className="object-cover" />
      </div>

      <div
        ref={frameRef}
        data-reel-frame=""
        className="relative aspect-16/10 overflow-hidden bg-surface shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)] ring-1 ring-ink/10 max-md:-mx-4 md:rounded-screen phone-cinema:mx-0 phone-cinema:rounded-screen"
      >
        <picture>
          <source type="image/avif" srcSet={`${posters["720"].avif} 720w, ${posters["1280"].avif} 1280w`} sizes={SCREEN_SIZES} />
          <source type="image/webp" srcSet={`${posters["720"].webp} 720w, ${posters["1280"].webp} 1280w`} sizes={SCREEN_SIZES} />
          {/* A plain <picture>: the posters are pre-encoded AVIF/WebP, which next/image would re-encode. */}
          <img
            src={posters["1280"].webp}
            width={media.w}
            height={media.h}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn("size-full", fit)}
          />
        </picture>
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          data-ready={ready || undefined}
          onLoadedData={() => setReady(true)}
          onEmptied={() => setReady(false)}
          className={cn(
            "absolute inset-0 size-full opacity-0 transition-opacity duration-(--dur-ui) data-ready:opacity-100",
            fit,
          )}
        />
        {/* The backdrop blur re-runs on every video frame beneath it, which phones skip: the plate is 90%
            opaque, so it barely shows. */}
        <button
          type="button"
          aria-pressed={paused}
          aria-label={`Pause the ${title} recording`}
          onClick={toggle}
          className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full bg-surface/90 text-ink shadow-[0_1px_3px_rgb(0_0_0/0.25)] ring-1 ring-ink/10 backdrop-blur-sm transition-colors duration-(--dur-micro) hover:bg-ink hover:text-surface max-lg:backdrop-blur-none"
        >
          {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
        </button>
      </div>

      {/* The logo plate: one height for every client, the width following the mark (capped); a
          zoomed mark overflows the plate evenly and is cropped to it. */}
      <div
        data-reel-logo=""
        className="absolute -bottom-4 left-0 grid h-12 max-w-40 place-content-center overflow-hidden rounded-xl bg-surface px-3 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)] ring-1 ring-ink/10 md:-left-4 lg:h-14 lg:rounded-2xl phone-cinema:bottom-2.5 phone-cinema:left-2.5 phone-cinema:h-10 phone-cinema:max-w-32 phone-cinema:rounded-[10px] phone-cinema:px-2.5"
        style={logoStyle}
      >
        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          sizes="200px"
          className="h-[calc(2rem*var(--logo-zoom))] w-auto max-w-none object-contain lg:h-[calc(2.5rem*var(--logo-zoom))] phone-cinema:h-[calc(1.625rem*var(--logo-zoom))]"
        />
      </div>
    </div>
  );
}
