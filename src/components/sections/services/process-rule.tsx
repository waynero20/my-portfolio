"use client";

import { useRef } from "react";

import { useMotionScene } from "@/lib/hooks/useMotionScene";
import { gsap } from "@/lib/motion/gsap";

import type { ProcessStage } from "@/lib/types";

import { SCRUB } from "@/lib/motion/tokens";

interface Props {
  stages: readonly ProcessStage[];
}

/** A stage lights once the drawn line reaches its node's centre (within this fraction of the rule). */
const LIGHT_EPSILON = 0.002;

/**
 * The process: four stages on a hairline rule. The rule's lit filament is a 1px div scrubbed with
 * scroll (SCRUB): scaleX along the top from lg, scaleY down the left edge below it. Each stage's
 * node and tag turn tungsten as the filament reaches the node. The resting CSS is fully drawn and
 * lit, so no JS and reduced motion show the finished rule; the scene arms the unlit state
 * (data-armed) only when it runs.
 */
export function ProcessRule({ stages }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useMotionScene(scopeRef, ({ reduced, desktop }) => {
    const scope = scopeRef.current;
    const track = scope?.querySelector<HTMLElement>("[data-process-track]");
    const fill = scope?.querySelector<HTMLElement>("[data-process-fill]");
    const list = scope?.querySelector<HTMLElement>("[data-process-list]");
    if (reduced || !scope || !track || !fill || !list) return;

    const steps = [...list.querySelectorAll<HTMLElement>("[data-process-step]")];
    // Where each node's centre sits along the track, 0–1. Re-measured on every refresh.
    let stops: number[] = [];

    const measure = () => {
      const box = track.getBoundingClientRect();
      stops = steps.map((step) => {
        const node = step.querySelector<HTMLElement>("[data-process-node]")?.getBoundingClientRect();
        if (!node) return 0;
        return desktop
          ? (node.left + node.width / 2 - box.left) / Math.max(1, box.width)
          : (node.top + node.height / 2 - box.top) / Math.max(1, box.height);
      });
    };

    const light = (progress: number) => {
      steps.forEach((step, i) => step.toggleAttribute("data-lit", progress >= (stops[i] ?? 0) - LIGHT_EPSILON));
    };

    scope.setAttribute("data-armed", "");
    measure();

    // The tween's own progress (not the trigger's) drives the nodes, so they light as the smoothed
    // filament arrives rather than ahead of it. GSAP calls onUpdate and onRefresh while it is still
    // creating the tween, so `draw` is read through a guard.
    const draw: { tween?: gsap.core.Tween } = {};
    const drawn = () => draw.tween?.progress() ?? 0;
    draw.tween = gsap.fromTo(
      fill,
      desktop ? { scaleX: 0 } : { scaleY: 0 },
      {
        ...(desktop ? { scaleX: 1 } : { scaleY: 1 }),
        ease: "none",
        onUpdate: () => light(drawn()),
        scrollTrigger: {
          trigger: list,
          // Desktop: a short sweep while the row crosses the lower half of the screen. Phones: the
          // filament's tip rides at 70% of the screen, so it grows as you read down the stages.
          start: desktop ? "top 85%" : "top 70%",
          end: desktop ? "top 35%" : "bottom 70%",
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            light(drawn());
          },
        },
      },
    );
    light(drawn());

    return () => {
      scope.removeAttribute("data-armed");
      steps.forEach((step) => step.removeAttribute("data-lit"));
    };
  });

  return (
    <div ref={scopeRef} className="process relative">
      <div aria-hidden data-process-track="" className="process-track">
        <div data-process-fill="" className="process-fill" />
      </div>
      <ol data-process-list="" className="grid gap-y-10 lg:grid-cols-4 lg:gap-x-8">
        {stages.map(({ tag, title, body }) => (
          <li key={tag} data-process-step="" className="relative pl-9 lg:pt-12 lg:pl-0">
            <span aria-hidden data-process-node="" className="process-node" />
            <p className="font-mono text-mono leading-none tracking-[0.12em] uppercase">
              <span className="process-tag">{tag}</span>
            </p>
            <h4 className="mt-4 text-[1.25rem] leading-tight font-medium tracking-[-0.02em] text-balance text-bone lg:text-[1.625rem]">
              {title}
            </h4>
            <p className="mt-3 max-w-[36ch] text-body text-ash">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
