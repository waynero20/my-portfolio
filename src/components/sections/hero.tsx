import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditionSwap } from "@/components/ui/edition-swap";
import { SocialCta } from "@/components/ui/social-cta";
import { HeroMotion } from "@/components/sections/hero-motion";
import { HeroPortrait } from "@/components/sections/hero-portrait";

import type { CssVars } from "@/lib/types";

import { EDITIONS, SITE, SOCIALS } from "@/lib/data";
import { DISSOLVE } from "@/lib/generated/dissolve";
import { PORTRAIT } from "@/lib/generated/portrait";
import { HERO_CAP_EM, heroCapBand, heroWordEm } from "@/lib/hero-fit";
import { HERO_PIN_SVH } from "@/lib/motion/tokens";

// The eyebrow reads "{role} — {city}, {country}".
const LOCATION = `${SITE.location.city}, ${SITE.location.country}`;

const HERO_SOCIAL_IDS = ["github", "linkedin", "instagram", "facebook"] as const;

const [FIRST_NAME, LAST_NAME] = SITE.name.split(" ");

const CAP_BAND = heroCapBand();

const { head: HEAD } = PORTRAIT;

/** The metrics hero.css lays the name, the bust rig and the lower third out with (see the top of hero.css). */
const NAME_METRICS: CssVars = {
  "--wayne-em-112": heroWordEm("WAYNE", "112"),
  "--rondina-em-112": heroWordEm("RONDINA", "112"),
  // Phones: each word's bare advance in the narrow cut, and the gaps between its letters that hero.css
  // tracks it out over.
  "--wayne-adv-75": heroWordEm("WAYNE", "75", 0),
  "--rondina-adv-75": heroWordEm("RONDINA", "75", 0),
  "--wayne-gaps": FIRST_NAME.length - 1,
  "--rondina-gaps": LAST_NAME.length - 1,
  "--cap-em": HERO_CAP_EM,
  "--cap-over": CAP_BAND.over,
  "--cap-under": CAP_BAND.under,
  "--head-ratio": HEAD.w / HEAD.h,
  "--photo-u-w": PORTRAIT.width,
  "--photo-u-h": PORTRAIT.height,
  "--head-u-x": HEAD.x,
  "--head-u-y": HEAD.y,
  "--head-u-h": HEAD.h,
};

type LooseLayer = "far" | "near";

/**
 * The dissolve's loose layers: far behind the bust, near in front of it. Each is a box in photo px
 * (hero.css .hero-rig) with its glint sprite; depth is the pointer parallax's travel (useHeroParallax).
 */
const LOOSE_LAYERS: Record<LooseLayer, { depth: number; className: string; style: CssVars }> = {
  far: { depth: 3, className: "hero-rig hero-dots hero-dots-far", style: looseStyle("far") },
  near: { depth: 9, className: "hero-rig hero-dots hero-dots-near", style: looseStyle("near") },
};

function looseStyle(id: LooseLayer): CssVars {
  const { box, glint } = DISSOLVE[id];
  return { "--bx": box.x, "--by": box.y, "--bw": box.w, "--bh": box.h, "--glint": `url("${glint}")` };
}

const SECTION_STYLE: CssVars = { "--hero-pin-h": `${HERO_PIN_SVH}svh` };

const HERO_SOCIALS = HERO_SOCIAL_IDS.map((id) => SOCIALS.find((social) => social.id === id)).filter(
  (social) => social !== undefined,
);

const MONO_LINK_CLASS =
  "inline-flex h-11 items-center gap-1.5 font-mono text-mono text-ash transition-colors duration-(--dur-micro) hover:text-bone";

interface DotLayerProps {
  id: LooseLayer;
}

/**
 * A loose dot layer. HeroMotion moves its box on scroll and useHeroParallax with the pointer; inside,
 * the drift (hero.css) carries the dots and their glints, which shimmer while the portrait is live.
 */
function DotLayer({ id }: DotLayerProps) {
  const { depth, className, style } = LOOSE_LAYERS[id];
  const { src, width, height } = DISSOLVE[id];

  return (
    <div aria-hidden data-hero-layer={id} data-depth={depth} className={className} style={style}>
      <div className="hero-drift">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB palette PNG of 1-bit dots; next/image would re-encode it lossy */}
        <img src={src} width={width} height={height} alt="" decoding="async" fetchPriority="low" draggable={false} />
        <span className="hero-glint" />
      </div>
    </div>
  );
}

/**
 * The cold open. Server-rendered, so the h1 is plain HTML in the hero face. The name and the bust rig
 * share one stacking context (.hero-name), back to front: WAYNE, the far dots, the bust (HeroPortrait,
 * whose black tee dissolves into the x-ray's bone dots), the near dots, RONDINA; the letterbox bars
 * cover everything. The dot layers are tiny baked PNGs (scripts/assets/build-dissolve.mts) that load
 * after the photo. hero.css holds the geometry and HeroMotion the scroll moves. Phones (below lg) are a
 * poster (Wayne's W27): the one-line eyebrow, the name stacked above the head with each word tracked
 * out to the full width, and "See the work" at the screen's foot; the status, the lead, the second
 * CTA and the socials are left to Contact and the footer there.
 */
export function Hero() {
  const { client, team } = EDITIONS;

  return (
    <section
      id="hero"
      data-section=""
      data-lighting-cue="hero"
      aria-labelledby="hero-title"
      className="hero-pin:h-(--hero-pin-h)"
      style={SECTION_STYLE}
    >
      <HeroMotion className="hero-stage relative isolate flex min-h-svh flex-col overflow-clip px-4 md:px-8 hero-pin:sticky hero-pin:top-0 hero-pin:h-svh">
        <div aria-hidden data-hero-bar="" className="absolute inset-x-0 top-0 z-20 h-(--lb) origin-top bg-letterbox" />
        <div aria-hidden data-hero-bar="" className="absolute inset-x-0 bottom-0 z-20 h-(--lb) origin-bottom bg-letterbox" />

        <div className="hero-frame @container mx-auto flex w-full flex-1 flex-col" style={NAME_METRICS}>
          {/* Fragment Mono swaps in over an Arial fallback about 30% wider, so below lg the eyebrow
              never wraps (no re-wrap, no layout shift). The status shows from lg; phones read it in
              Contact. The two only share a row from lg. */}
          <div className="relative z-10 flex flex-col gap-y-1 font-mono text-mono leading-5 lg:flex-row lg:items-center lg:gap-x-6">
            <p className="text-ash uppercase max-lg:whitespace-nowrap">
              <span>{SITE.role} —</span> {LOCATION}
            </p>
            <p className="text-bone max-lg:hidden">{SITE.status}</p>
          </div>

          <div className="hero-name mt-10 lg:mt-6">
            <DotLayer id="far" />
            <HeroPortrait />
            <DotLayer id="near" />

            <h1 id="hero-title" className="hero-title font-hero uppercase">
              <span data-hero-word="first" className="hero-word axes [--wdth:75] [--wght:640] lg:[--wdth:112]">
                {FIRST_NAME}
              </span>
              <span aria-hidden className="hero-gap" />{" "}
              <span data-hero-word="last" className="hero-word axes [--wdth:75] [--wght:640] lg:[--wdth:112]">
                {LAST_NAME}
              </span>
            </h1>
          </div>

          {/* Phones keep only the primary CTA, at the screen's foot (margin-top: auto). */}
          <div className="hero-lower relative z-10 flex flex-col gap-4 max-lg:mt-auto max-lg:items-center sm:gap-5 lg:mt-5">
            <p className="max-w-[34rem] text-body leading-[1.62] text-bone max-lg:hidden lg:text-body-lg">
              <EditionSwap client={client.lead} team={team.lead} />
            </p>
            {/* From xl the CTAs and the socials share one row, even where it runs past the lead's
                column: that low on the stage the dissolve has thinned to a few dim dots. From lg
                to xl the socials always take their own row, as hero.css's --hero-chrome assumes. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-lg:justify-center lg:gap-y-4 xl:w-max xl:flex-nowrap">
              <div className="flex flex-wrap gap-3 max-lg:justify-center lg:max-xl:basis-full">
                <EditionSwap
                  client={
                    <Button href={client.primaryCta.href} size="lg">
                      {client.primaryCta.label}
                    </Button>
                  }
                  team={
                    <Button href={team.primaryCta.href} size="lg">
                      {team.primaryCta.label}
                    </Button>
                  }
                />
                <span className="contents max-lg:hidden">
                  <EditionSwap
                    client={
                      <Button href={client.secondaryCta.href} intent="outline" size="lg">
                        {client.secondaryCta.label}
                      </Button>
                    }
                    team={
                      <Button href={team.secondaryCta.href} intent="outline" size="lg">
                        {team.secondaryCta.label}
                      </Button>
                    }
                  />
                </span>
              </div>
              <ul aria-label="Profiles" className="hero-socials flex items-center gap-2 max-lg:hidden">
                {HERO_SOCIALS.map((social) => (
                  <li key={social.id} className="flex">
                    <SocialCta social={social} variant="tile" />
                  </li>
                ))}
                {SITE.resume && (
                  <li className="ml-2">
                    <a href={SITE.resume} className={MONO_LINK_CLASS}>
                      Résumé
                      <ArrowDown aria-hidden className="size-3.5" />
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* The bottom letterbox bar's height (at least the frame's bottom margin on screens without bars). */}
          <div aria-hidden className="min-h-[max(var(--lb),1.5rem)] lg:mt-auto" />
        </div>
      </HeroMotion>
    </section>
  );
}
