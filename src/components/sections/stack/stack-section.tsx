import { ProjectLogo } from "@/components/ui/project-logo";
import { CallSheet } from "@/components/sections/stack/call-sheet";

import { buildCallSheet, pickTools } from "@/lib/call-sheet";
import { EVERYDAY_KIT, PROJECTS, TOOLS } from "@/lib/data";

// TODO(controller): move this intro copy into data.ts (a STACK_COPY block); M2 agents may only edit
// their own data.ts blocks, so it waits here for now.
const INTRO = {
  kicker: "Stack",
  title: "The call sheet",
  lead: "Every tool here shipped in real client work. A tick marks where.",
  hintFine: "Hover a project to follow it, click to pin. Hover a tool for the why.",
  hintTouch: "Tap a project to pin it. Tap a tool for the why.",
  keyLabel: "Key",
  caption:
    "Tools by project: a tick marks each project a tool shipped in. Project headers pin their column; tool names show why the tool was used.",
} as const;

const SHEET = buildCallSheet(PROJECTS, TOOLS);
const KIT = pickTools(TOOLS, EVERYDAY_KIT);

/**
 * Stack: "the call sheet". The intro and the key (abbreviation → project) on the left from lg, the
 * table on the right. The table model is built here, on the server; CallSheet is the client island
 * that pins, previews and shows each tool's "why" line. The call sheet's "why" slot is the section's
 * bottom padding, so the section has none of its own.
 */
export function StackSection() {
  return (
    <section
      id="stack"
      data-section=""
      data-lighting-cue="stack"
      aria-labelledby="stack-title"
      className="border-t border-hairline px-4 pt-20 md:px-8 lg:pt-20"
    >
      <div className="mx-auto grid max-w-7xl gap-y-10 lg:grid-cols-12 lg:gap-x-6">
        <header data-atmo-text="" className="lg:sticky lg:top-12 lg:col-span-4 lg:self-start">
          <p className="flex items-center gap-3 font-mono text-mono tracking-[0.08em] text-ash uppercase">
            <span aria-hidden className="h-px w-6 bg-tungsten" />
            {INTRO.kicker}
          </p>
          <h2 id="stack-title" className="mt-5 text-h2 leading-[0.9] font-medium tracking-[-0.04em] text-balance text-bone">
            {INTRO.title}
          </h2>
          <p className="mt-6 max-w-[24rem] text-body text-ash lg:text-body-lg">{INTRO.lead}</p>
          <p className="mt-4 font-mono text-[0.75rem] leading-relaxed text-pretty text-ash">
            <span className="hidden pointer-fine:inline">{INTRO.hintFine}</span>
            <span className="pointer-fine:hidden">{INTRO.hintTouch}</span>
          </p>

          {/* The key to the column logos. Sighted readers need it; screen readers already get each
              column's full name from its header, so it is hidden from them. Phones get a tight
              two-column list with no label (the table follows straight after); from sm it is a
              labelled block, and from lg it sits beside the table. */}
          <div aria-hidden className="mt-6 sm:mt-8 sm:border-t sm:border-hairline sm:pt-5 lg:mt-12">
            <p className="hidden font-mono text-mono tracking-[0.14em] text-ash uppercase sm:block">{INTRO.keyLabel}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:mt-3 sm:grid-cols-3 sm:gap-y-2.5 lg:grid-cols-1 xl:grid-cols-2">
              {SHEET.columns.map(({ slug, title, surface }) => (
                <li
                  key={slug}
                  className="flex min-w-0 items-center gap-2.5 text-[0.8125rem] leading-tight text-bone/90 sm:text-[0.875rem]"
                >
                  <ProjectLogo slug={slug} surface={surface} size="sm" className="size-7 sm:size-8" />
                  <span className="truncate">{title}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div data-atmo-text="" className="lg:col-span-8">
          <CallSheet sheet={SHEET} kit={KIT} caption={INTRO.caption} />
        </div>
      </div>
    </section>
  );
}
