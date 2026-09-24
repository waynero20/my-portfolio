import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditionSwap } from "@/components/ui/edition-swap";
import { SocialCta } from "@/components/ui/social-cta";
import { HeroMotion } from "@/components/sections/hero-motion";
import { HeroPortrait } from "@/components/sections/hero-portrait";

import type { CssVars } from "@/lib/types";

import { EDITIONS, SITE, SOCIALS } from "@/lib/data";
import { PORTRAIT } from "@/lib/generated/portrait";
import { HERO_CAP_EM, heroCapBand, heroWordEm } from "@/lib/hero-fit";
import { HERO_PIN_SVH } from "@/lib/motion/tokens";

// The eyebrow reads "{role} — {city}, {country}".
const LOCATION = `${SITE.location.city}, ${SITE.location.country}`;

const HERO_SOCIAL_IDS = ["github", "linkedin", "instagram", "facebook"] as const;

const [FIRST_NAME, LAST_NAME] = SITE.name.split(" ");

const CAP_BAND = heroCapBand();

const { head: HEAD, cloud: CLOUD } = PORTRAIT;

/** The metrics hero.css lays the name, the bust rig and the lower third out with (see the top of hero.css). */
const NAME_METRICS: CssVars = {
  "--wayne-em-112": heroWordEm("WAYNE", "112"),
  "--rondina-em-75": heroWordEm("RONDINA", "75"),
  "--rondina-em-112": heroWordEm("RONDINA", "112"),
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

const BACK_CLOUD_STYLE: CssVars = {
  "--bx": CLOUD.back.box.x,
  "--by": CLOUD.back.box.y,
  "--bw": CLOUD.back.box.w,
  "--bh": CLOUD.back.box.h,
};

/** The front layer has a phone bake (frontSm) with its own box; hero.css picks the pair per breakpoint. */
const FRONT_CLOUD_STYLE: CssVars = {
  "--lg-x": CLOUD.front.box.x,
  "--lg-y": CLOUD.front.box.y,
  "--lg-w": CLOUD.front.box.w,
  "--lg-h": CLOUD.front.box.h,
  "--sm-x": CLOUD.frontSm.box.x,
  "--sm-y": CLOUD.frontSm.box.y,
  "--sm-w": CLOUD.frontSm.box.w,
  "--sm-h": CLOUD.frontSm.box.h,
};

const SECTION_STYLE: CssVars = { "--hero-pin-h": `${HERO_PIN_SVH}svh` };

const HERO_SOCIALS = HERO_SOCIAL_IDS.map((id) => SOCIALS.find((social) => social.id === id)).filter(
  (social) => social !== undefined,
);

const MONO_LINK_CLASS =
  "inline-flex h-11 items-center gap-1.5 font-mono text-mono text-ash transition-colors duration-(--dur-micro) hover:text-bone";

/**
 * The cold open. Server-rendered, so the h1 is plain HTML in the hero face. The name and the bust rig
 * share one stacking context (.hero-name), back to front: WAYNE, the back cloud, the bust
 * (HeroPortrait), the front cloud, RONDINA; the letterbox bars cover everything. The clouds are baked
 * images (scripts/assets/build-cloud.mts) that load after the photo. hero.css holds the geometry and
 * HeroMotion the scroll moves.
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
          {/* Fragment Mono swaps in over an Arial fallback about 30% wider, so these lines break the
              same way in both faces (no re-wrap, no layout shift): the role splits below sm, the
              status reserves two lines below sm, and the two only share a row from lg. */}
          <div className="relative z-10 flex flex-col gap-y-1 font-mono text-mono leading-5 lg:flex-row lg:items-center lg:gap-x-6">
            <p className="text-ash uppercase">
              <span className="max-sm:block">{SITE.role} —</span> {LOCATION}
            </p>
            <p className="text-bone max-sm:min-h-10">{SITE.status}</p>
          </div>

          <div className="hero-name mt-6">
            <div aria-hidden data-hero-layer="back" data-depth="3" className="hero-rig hero-cloud-back" style={BACK_CLOUD_STYLE}>
              <picture>
                <source type="image/avif" srcSet={CLOUD.back.avif} />
                <img
                  src={CLOUD.back.webp}
                  width={CLOUD.back.width}
                  height={CLOUD.back.height}
                  alt=""
                  decoding="async"
                  fetchPriority="low"
                  draggable={false}
                />
              </picture>
            </div>

            <HeroPortrait />

            <div aria-hidden data-hero-layer="front" data-depth="9" className="hero-rig hero-cloud-front" style={FRONT_CLOUD_STYLE}>
              <picture>
                <source media="(max-width: 1023px)" type="image/avif" srcSet={CLOUD.frontSm.avif} width={CLOUD.frontSm.width} height={CLOUD.frontSm.height} />
                <source media="(max-width: 1023px)" type="image/webp" srcSet={CLOUD.frontSm.webp} width={CLOUD.frontSm.width} height={CLOUD.frontSm.height} />
                <source type="image/avif" srcSet={CLOUD.front.avif} />
                <img
                  src={CLOUD.front.webp}
                  width={CLOUD.front.width}
                  height={CLOUD.front.height}
                  alt=""
                  decoding="async"
                  fetchPriority="low"
                  draggable={false}
                />
              </picture>
            </div>

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

          <div className="hero-lower relative z-10 mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-5 lg:mt-5">
            <p className="max-w-[34rem] text-body leading-[1.62] text-bone lg:text-body-lg">
              <EditionSwap client={client.lead} team={team.lead} />
            </p>
            {/* From xl the CTAs and the socials share one row, even where it runs past the lead's
                column: that low on the stage the cloud's belly has dissolved to near black. From lg
                to xl the socials always take their own row, as hero.css's --hero-chrome assumes. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-4 xl:w-max xl:flex-nowrap">
              <div className="flex flex-wrap gap-3 lg:max-xl:basis-full">
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
              </div>
              <ul aria-label="Profiles" className="hero-socials flex items-center gap-2">
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
          <div aria-hidden className="mt-auto min-h-[max(var(--lb),1.5rem)]" />
        </div>
      </HeroMotion>
    </section>
  );
}
