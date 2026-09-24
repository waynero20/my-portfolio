"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import { ProjectLogo } from "@/components/ui/project-logo";

import { requestRefresh } from "@/lib/motion/gsap";

import type { TransitionEvent } from "react";
import type { ServiceRowItem } from "@/lib/types";

import { cn } from "@/lib/utils";

interface Props {
  services: readonly ServiceRowItem[];
}

/** How long the panels must be still before ScrollTrigger re-measures the triggers below them. */
const REFRESH_DEBOUNCE_MS = 120;

/**
 * The four service rows. Each is an h3 wrapping a full-width disclosure button; its panel opens with
 * grid-template-rows 0fr → 1fr (the inner wrapper is inert while closed), and several can be open at
 * once. Opening moves everything below, so a settled panel asks ScrollTrigger to re-measure.
 */
export function ServiceRows({ services }: Props) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const timer = refreshTimer;
    return () => clearTimeout(timer.current);
  }, []);

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const onPanelSettled = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "grid-template-rows") return;
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(requestRefresh, REFRESH_DEBOUNCE_MS);
  };

  return (
    <div data-atmo-text="" className="border-b border-hairline">
      {services.map(({ id, title, deliverables, reels }) => {
        const isOpen = open.has(id);
        const buttonId = `service-${id}`;
        const panelId = `service-${id}-panel`;

        return (
          <div key={id} className="service-row border-t border-hairline">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(id)}
                className="service-trigger group grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-6 text-left lg:grid-cols-12 lg:gap-x-6 lg:py-7"
              >
                <span className="service-title font-medium text-balance lg:col-span-11">{title}</span>
                <span className="flex items-center justify-self-end pt-0.5 lg:col-span-1 lg:pt-3">
                  <span aria-hidden className="service-toggle">
                    <span className="service-toggle-bar" />
                    <span className="service-toggle-bar service-toggle-bar--v" />
                  </span>
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role={isOpen ? "region" : undefined}
              aria-labelledby={isOpen ? buttonId : undefined}
              data-open={isOpen || undefined}
              onTransitionEnd={onPanelSettled}
              className="service-panel grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--dur-ui) ease-settle data-open:grid-rows-[1fr]"
            >
              <div inert={!isOpen} className="min-h-0 overflow-hidden">
                <div className="service-panel-body grid gap-8 pb-10 lg:grid-cols-12 lg:gap-x-6 lg:pb-14">
                  <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:col-span-7">
                    {deliverables.map((deliverable) => (
                      <li key={deliverable} className="flex gap-3 text-body text-bone/90 lg:text-body-lg">
                        <span aria-hidden className="mt-[0.8em] h-px w-3 shrink-0 bg-tungsten/70" />
                        {deliverable}
                      </li>
                    ))}
                  </ul>
                  {/* The projects this service shipped as: each brand's logo on its own surface, a cut
                      back up to that reel (it lands flooded). No label, no numbers (W12). */}
                  <ul aria-label={`${title}: projects`} className="flex flex-wrap gap-2.5 lg:col-span-4 lg:col-start-9 lg:flex-col lg:items-start">
                    {reels.map(({ slug, title: projectTitle, surface }) => (
                      <li key={slug}>
                        <a
                          href={`#reel-${slug}`}
                          data-reel-link={slug}
                          data-jump="cut"
                          className="group/chip inline-flex h-13 items-center gap-3 rounded-xl border border-hairline bg-seat/50 py-1.5 pr-4 pl-1.5 text-body leading-none text-bone transition-colors duration-(--dur-micro) ease-settle hover:border-bone/50 hover:bg-seat"
                        >
                          <ProjectLogo slug={slug} surface={surface} size="md" />
                          {projectTitle}
                          <ArrowUp
                            aria-hidden
                            className={cn(
                              "size-3.5 text-ash transition-[translate,color] duration-(--dur-micro) ease-settle",
                              "group-hover/chip:-translate-y-0.5 group-hover/chip:text-bone",
                            )}
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
