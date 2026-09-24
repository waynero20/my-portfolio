import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ToolIcon } from "@/components/ui/tool-icon";
import { ReelScreen } from "@/components/sections/work/reel-screen";
import { ReelSlate } from "@/components/sections/work/reel-slate";
import { ReelTitle } from "@/components/sections/work/reel-title";

import type { ReelMedia } from "@/lib/content";
import type { CssVars, LiveLink, Project } from "@/lib/types";

import { NIGHT_TYPECAST, SITE, TOOLS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { reelGeometry, reelPhoneGeometry } from "@/lib/work/flood";

const toolName = (id: Project["stack"][number]) => TOOLS.find((tool) => tool.id === id)?.name ?? id;

interface Props {
  project: Project;
  /** The reel's position in PROJECTS. */
  index: number;
  total: number;
  media: ReelMedia;
}

interface LiveCtaProps {
  live: LiveLink;
}

/**
 * "Visit live site" in the brand's CTA colours, or a private system's walkthrough request by email.
 * The walkthrough label is long, so it may wrap inside its column (a phone, or the narrow 5/12
 * column from 1024px) instead of pushing the column wider than the screen.
 */
function LiveCta({ live }: LiveCtaProps) {
  if (live.kind === "public") {
    return (
      <Button href={live.href} target="_blank" rel="noopener">
        Visit live site
        <ArrowUpRight aria-hidden className="size-4" />
        <span className="sr-only">(opens in a new tab)</span>
      </Button>
    );
  }
  return (
    <Button
      href={`mailto:${SITE.email}?subject=${encodeURIComponent(live.mailSubject)}`}
      className="h-auto min-h-11 max-w-full justify-between py-2.5 text-left leading-snug whitespace-normal text-balance"
    >
      {live.label}
      <ArrowRight aria-hidden className="size-4 shrink-0" />
    </Button>
  );
}

/**
 * One reel. The article carries the theme scope (data-reel, data-scheme) but is not a page section
 * (no data-section): it is a chapter inside #work, reached by its own #reel-… anchor. Inside it the
 * stage (sticky and 100svh in cinema) holds the spill and, above it, the brand layer the flood clips
 * (work.css). Every piece of reel text lives inside that layer, so brand ink never lands on the dark
 * room.
 *
 * Cinema geometry (Ruling R26, reelGeometry): the article is 100svh of stage plus its hold, pulled
 * up under the previous reel by the overlap, stacked above it (z-index by reel) and scroll-margined
 * to its landing, so a #reel-… jump (Lenis or native, including a page loaded at the hash) lands
 * where the flood completes. The article and stage let the pointer through; only the layer takes it.
 *
 * Desktop splits 5/12 (slate, title, copy, centred as a block) and 7/12 (the screen, centred on its
 * own), so every reel's screen sits in exactly the same place: the next reel lights up right where
 * the current screen is. Below lg the grid is one minmax(0, 1fr) column, so no min-content child
 * (a long CTA, a nowrap title) can widen the track past the stage, which clips it out of sight.
 *
 * Phones and portrait tablets tall enough (the phone-cinema variant, MQ.phoneCinema) run the same
 * hand-off on a one-screen layout (work.css .reel-zone): the stage is 100lvh with the reel in its top
 * 100svh, the screen is inset at the same place in every reel with the logo plate inside it, the stack
 * keeps to one line and the story is left out (reelPhoneGeometry sizes the articles).
 *
 * The scene fades three marked groups (useReelScenes): the text columns (data-reel-text) recede as
 * the next room floods over them, the stack (data-reel-chips) shows only once its own room floods,
 * and data-reel-edge draws the flooding room's shadowed rim over the room it covers.
 */
export function Reel({ project, index, total, media }: Props) {
  const { slug, title, category, market, tagline, story, highlights, outcome, stack, live, theme, titleFont } = project;
  const titleId = `reel-${slug}-title`;
  const { hold, overlap, landing } = reelGeometry(index, total);
  const phone = reelPhoneGeometry(index, total);
  const style: CssVars = {
    "--reel-h": `${100 + hold}svh`,
    "--reel-overlap": `${overlap}svh`,
    "--reel-landing": `${landing}svh`,
    "--reel-z": index + 1,
    "--reel-ph-h": `calc(100lvh + ${phone.hold}svh)`,
    "--reel-ph-overlap": `calc(100lvh + ${phone.overlap}svh)`,
    "--reel-ph-landing": `${phone.landing}svh`,
  };

  return (
    <article
      id={`reel-${slug}`}
      data-reel={slug}
      data-reel-index={index}
      data-scheme={theme.scheme}
      aria-labelledby={titleId}
      className={cn(
        "relative cinema:pointer-events-none cinema:z-(--reel-z) cinema:h-(--reel-h) cinema:-scroll-mt-(--reel-landing)",
        index > 0 && "cinema:-mt-(--reel-overlap)",
        "phone-cinema:pointer-events-none phone-cinema:z-(--reel-z) phone-cinema:h-(--reel-ph-h) phone-cinema:-scroll-mt-(--reel-ph-landing)",
        index > 0 && "phone-cinema:-mt-(--reel-ph-overlap)",
      )}
      style={style}
    >
      {/* The stage bleeds 1px past both viewport edges: a sticky box at a fractional scroll position
          (Lenis) can otherwise leave a hairline of night at the bottom edge. */}
      <div
        data-reel-stage=""
        className="relative overflow-clip cinema:sticky cinema:-top-px cinema:h-[calc(100svh+2px)] phone-cinema:sticky phone-cinema:-top-px phone-cinema:h-[calc(100lvh+2px)]"
      >
        <div data-reel-spill="" aria-hidden className="reel-spill pointer-events-none absolute inset-0" />
        {/* The flooding room's rim: a hairline and a soft shadow cast outward onto the room it covers
            (the layer's clip-path would clip its own shadow). Painted under the layer. */}
        <div data-reel-edge="" aria-hidden className="reel-edge pointer-events-none absolute hidden cinema:block phone-cinema:block" />
        <div
          data-reel-layer=""
          className="reel-layer relative bg-surface px-4 text-ink md:px-8 cinema:h-full phone-cinema:h-full phone-cinema:px-5"
        >
          {/* Body copy on a light surface gets the same +10 weight that [data-scheme=light] gives the
              axes (globals.css only reaches .axes elements); dark reels keep the night 390. */}
          <div
            data-reel-zone=""
            className={cn(
              "reel-zone mx-auto grid max-w-7xl grid-cols-1 gap-y-8 py-16 md:py-24",
              "lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-12 lg:gap-y-7",
              "cinema:h-full cinema:py-10",
              theme.scheme === "light" && "font-[400]",
            )}
          >
            <header data-reel-text="" className="flex flex-col gap-4 lg:col-span-5 lg:row-start-2 phone-cinema:gap-1.5">
              <ReelSlate category={category} market={market} />
              <ReelTitle
                id={titleId}
                slug={slug}
                title={title}
                night={NIGHT_TYPECAST}
                font={titleFont}
                gradient={theme.titleGradient}
              />
            </header>

            <div className="relative lg:col-span-7 lg:col-start-6 lg:row-span-4 lg:row-start-1 lg:self-center phone-cinema:mt-4">
              <ReelScreen
                index={index}
                slug={slug}
                title={title}
                media={media}
                logo={project.logo}
                overlay={project.overlay}
                spillMode={theme.spillMode}
              />
              {/* The stack, captioned under the screen, clear of the logo plate and of the lit screen's
                  clip (frame + 28px). In cinema it hangs below the frame out of flow, so a longer
                  list never moves the screen off the shared position. */}
              <ul
                aria-label="Built with"
                data-reel-chips=""
                className="mt-10 flex flex-wrap gap-2 cinema:absolute cinema:inset-x-0 cinema:top-full phone-cinema:mt-3.5 phone-cinema:flex-nowrap phone-cinema:items-center phone-cinema:gap-1.5 phone-cinema:overflow-hidden"
              >
                {stack.map((id) => (
                  <li key={id} data-chip="" className="phone-cinema:flex phone-cinema:shrink-0">
                    <Chip className="phone-cinema:gap-1 phone-cinema:px-2 phone-cinema:text-[0.6875rem] phone-cinema:whitespace-nowrap">
                      <ToolIcon id={id} className="phone-cinema:size-3" />
                      {toolName(id)}
                    </Chip>
                  </li>
                ))}
                {/* The phone showcase keeps the stack to one line: the scene unhides this summary and
                    counts in it the chips it moved out of sight (still read out, work.css). */}
                <li aria-hidden hidden data-chip-more="" className="phone-cinema:flex phone-cinema:shrink-0">
                  <Chip className="phone-cinema:h-5 phone-cinema:px-2 phone-cinema:text-[0.6875rem]" />
                </li>
              </ul>
            </div>

            {/* From 1024 to 1279px the 5/12 column is narrow, so the copy tightens to fit a 700px stage. */}
            <div
              data-reel-text=""
              className="flex flex-col items-start gap-5 lg:col-span-5 lg:row-start-3 lg:max-xl:gap-4 phone-cinema:mt-4 phone-cinema:gap-3"
            >
              <p className="text-body-lg leading-snug font-medium text-pretty">{tagline}</p>
              <p className="text-body text-pretty text-muted lg:max-xl:text-[0.9375rem] lg:max-xl:leading-normal phone-cinema:hidden">
                {story}
              </p>
              <ul className="flex flex-col gap-2 text-body leading-snug lg:max-xl:gap-1.5 lg:max-xl:text-[0.9375rem] phone-cinema:gap-1.5 phone-cinema:text-[0.9375rem]">
                {highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <span aria-hidden className="mt-[0.8em] h-px w-3 shrink-0 bg-accent" />
                    {highlight}
                  </li>
                ))}
              </ul>
              {outcome && (
                <p className="text-body">
                  <span className="mr-2 font-mono text-mono text-muted uppercase">Outcome</span>
                  {outcome}
                </p>
              )}
              <LiveCta live={live} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
