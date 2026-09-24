import { ProcessRule } from "@/components/sections/services/process-rule";
import { ServiceRows } from "@/components/sections/services/service-rows";

import type { ReelSlug, ServiceReel, ServiceRowItem } from "@/lib/types";

import { PROCESS, PROJECTS, SERVICES } from "@/lib/data";

// TODO(controller): move this intro copy into data.ts (a SERVICES_COPY block); M2 agents may only
// edit their own data.ts blocks, so it waits here for now.
const INTRO = {
  kicker: "Services & process",
  title: "What I build",
  lead: "Four kinds of project, each one already on screen above. Open a row for what's included.",
  processKicker: "Process",
  processTitle: "How a project runs",
} as const;

function toServiceReel(slug: ReelSlug): ServiceReel[] {
  const project = PROJECTS.find((candidate) => candidate.slug === slug);
  return project ? [{ slug, title: project.title, surface: project.theme.surface }] : [];
}

const SERVICE_ROWS: readonly ServiceRowItem[] = SERVICES.map(({ id, title, deliverables, reels }) => ({
  id,
  title,
  deliverables,
  reels: reels.flatMap(toServiceReel),
}));

/**
 * Services & process. The intro, the four expandable service rows (ServiceRows, a client island) and
 * the process on its scroll-drawn rule (ProcessRule, a client island). Server-rendered otherwise.
 */
export function ServicesSection() {
  return (
    <section
      id="services"
      data-section=""
      data-lighting-cue="services"
      aria-labelledby="services-title"
      className="border-t border-hairline px-4 pt-20 pb-20 md:px-8 lg:pt-24 lg:pb-20"
    >
      <div className="mx-auto max-w-7xl">
        <header data-atmo-text="" className="grid gap-y-6 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-3 font-mono text-mono tracking-[0.08em] text-ash uppercase">
              <span aria-hidden className="h-px w-6 bg-tungsten" />
              {INTRO.kicker}
            </p>
            <h2 id="services-title" className="mt-5 text-h2 leading-[0.9] font-medium tracking-[-0.04em] text-bone">
              {INTRO.title}
            </h2>
          </div>
          <p className="max-w-[26rem] text-body text-ash lg:col-span-4 lg:col-start-9 lg:pb-2 lg:text-body-lg">
            {INTRO.lead}
          </p>
        </header>

        <div className="mt-12 lg:mt-14">
          <ServiceRows services={SERVICE_ROWS} />
        </div>

        <div className="mt-16 lg:mt-20">
          <div data-atmo-text="" className="mb-10 lg:mb-12">
            <p className="flex items-center gap-3 font-mono text-mono tracking-[0.08em] text-ash uppercase">
              <span aria-hidden className="h-px w-6 bg-tungsten" />
              {INTRO.processKicker}
            </p>
            <h3 className="mt-4 text-[clamp(1.75rem,3.4vw,3rem)] leading-none font-medium tracking-[-0.03em] text-bone">
              {INTRO.processTitle}
            </h3>
          </div>
          <div data-atmo-text="">
            <ProcessRule stages={PROCESS} />
          </div>
        </div>
      </div>
    </section>
  );
}
