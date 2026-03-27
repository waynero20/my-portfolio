"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, createRef, RefObject } from "react";
import gsap from "gsap";
import { techStack } from "@/lib/data";

/* ── Card swap config ── */

const CARD_DISTANCE = 50;
const VERTICAL_DISTANCE = 55;
const SKEW = 5;
const SWAP_DELAY = 4000;

const categories = Object.entries(techStack);

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

function makeSlot(i: number, total: number): Slot {
  return {
    x: i * CARD_DISTANCE,
    y: -i * VERTICAL_DISTANCE,
    z: -i * CARD_DISTANCE * 1.5,
    zIndex: total - i,
  };
}

function placeNow(el: HTMLElement, slot: Slot) {
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: SKEW,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });
}

/* ── Tech icon slugs (simple-icons CDN) ── */

const techIconSlug: Record<string, string> = {
  React: "react",
  "Next.js": "nextdotjs",
  TypeScript: "typescript",
  "Tailwind CSS": "tailwindcss",
  "Framer Motion": "framer",
  GSAP: "greensock",
  Supabase: "supabase",
  PostgreSQL: "postgresql",
  "REST APIs": "",
  "React Query": "reactquery",
  "AWS S3": "aws:s3",
  "AWS Rekognition": "aws:rekognition",
  "AWS Textract": "aws:textract",
  "AWS CloudFront": "aws:cloudfront",
  Cloudinary: "cloudinary",
  "Upstash Redis": "redis",
  Contentful: "contentful",
  Git: "git",
  Vercel: "vercel",
};

const ICON_COLOR = "2563eb";

// Unique icon slugs for the marquee (deduplicated, skip empty & aws: prefixed)
const marqueeIcons = [
  ...new Set(
    Object.values(techIconSlug).filter((s) => s && !s.startsWith("aws:"))
  ),
];

/* ── Category icons ── */

const categoryIcons: Record<string, React.ReactNode> = {
  Frontend: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  "Backend & Data": (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
    </svg>
  ),
  Cloud: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  "Tools & CMS": (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.324A1 1 0 015 17.657V6.343a1 1 0 011.036-.837l5.384 3.324m0 0l5.384-3.324A1 1 0 0118 6.343v11.314a1 1 0 01-1.036.837L11.42 15.17z" />
    </svg>
  ),
};

/* ── Tech stack section ── */

export function TechStack() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const containerRef = useRef<HTMLDivElement>(null);

  const cardRefs = useRef<RefObject<HTMLDivElement | null>[]>(
    categories.map(() => createRef<HTMLDivElement>())
  );
  const orderRef = useRef<number[]>(categories.map((_, i) => i));
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number>(0);
  const bringToFrontRef = useRef<((cardIdx: number) => void) | null>(null);

  useEffect(() => {
    const total = categories.length;
    const refs = cardRefs.current;
    const ease = "elastic.out(0.6,0.9)";
    const dur = 2;

    // Place cards in initial positions
    refs.forEach((r, i) => {
      if (r.current) placeNow(r.current, makeSlot(i, total));
    });

    const startAutoSwap = () => {
      clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(swap, SWAP_DELAY);
    };

    function swap() {
      if (orderRef.current.length < 2) return;

      const [front, ...rest] = orderRef.current;
      const elFront = refs[front].current;
      if (!elFront) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Drop front card down
      tl.to(elFront, { y: "+=500", duration: dur, ease });

      // Promote remaining cards forward
      tl.addLabel("promote", `-=${dur * 0.9}`);
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        if (!el) return;
        const slot = makeSlot(i, total);
        tl.set(el, { zIndex: slot.zIndex }, "promote");
        tl.to(
          el,
          { x: slot.x, y: slot.y, z: slot.z, duration: dur, ease },
          `promote+=${i * 0.15}`
        );
      });

      // Return front card to back
      const backSlot = makeSlot(total - 1, total);
      tl.addLabel("return", `promote+=${dur * 0.05}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tl as any).call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }); }, undefined, "return");
      tl.to(
        elFront,
        { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: dur, ease },
        "return"
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tl as any).call(() => {
        orderRef.current = [...rest, front];
      });
    }

    function bringToFront(clickedIdx: number) {
      const order = orderRef.current;
      const posInOrder = order.indexOf(clickedIdx);
      if (posInOrder <= 0) return; // already front

      // Kill current animation & auto-swap
      tlRef.current?.kill();
      clearInterval(intervalRef.current);

      // Snap all cards to their current slot positions first (in case mid-animation)
      order.forEach((idx, pos) => {
        const el = refs[idx].current;
        if (el) placeNow(el, makeSlot(pos, total));
      });

      // Build new order: clicked card to front, rest keep relative order
      const newOrder = [clickedIdx, ...order.filter((i) => i !== clickedIdx)];

      const tl = gsap.timeline();
      tlRef.current = tl;

      const clickedEl = refs[clickedIdx].current!;

      // Lift clicked card up first
      tl.to(clickedEl, {
        z: 200,
        scale: 1.06,
        zIndex: total + 1,
        duration: 0.3,
        ease: "power2.out",
      }, 0);

      // Move other cards to their new slots
      newOrder.forEach((idx, newPos) => {
        if (idx === clickedIdx) return;
        const el = refs[idx].current;
        if (!el) return;
        const slot = makeSlot(newPos, total);
        tl.to(el, {
          x: slot.x, y: slot.y, z: slot.z,
          zIndex: slot.zIndex,
          duration: 1.2,
          ease,
        }, 0.15);
      });

      // Settle clicked card into front slot
      const frontSlot = makeSlot(0, total);
      tl.to(clickedEl, {
        x: frontSlot.x,
        y: frontSlot.y,
        z: frontSlot.z,
        scale: 1,
        zIndex: frontSlot.zIndex,
        duration: 1.2,
        ease,
      }, 0.25);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tl as any).call(() => {
        orderRef.current = newOrder;
        startAutoSwap();
      });
    }

    bringToFrontRef.current = bringToFront;

    swap();
    startAutoSwap();

    // Pause on hover
    const node = containerRef.current;
    if (node) {
      const pause = () => {
        tlRef.current?.pause();
        clearInterval(intervalRef.current);
      };
      const resume = () => {
        tlRef.current?.play();
        startAutoSwap();
      };
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
      return () => {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
        clearInterval(intervalRef.current);
      };
    }

    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="stack"
      className="relative w-full bg-white py-24 sm:py-32 px-8 sm:px-16 md:px-24 overflow-hidden"
    >
      {/* Marquee icon overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <div className="absolute inset-0 flex flex-col justify-between py-4">
          {[
            { dir: "left", speed: 15 },
            { dir: "right", speed: 12 },
            { dir: "left", speed: 18 },
            { dir: "right", speed: 14 },
            { dir: "left", speed: 16 },
            { dir: "right", speed: 13 },
            { dir: "left", speed: 17 },
          ].map((row, rowIdx) => {
            const icons = row.dir === "right" ? marqueeIcons.slice().reverse() : marqueeIcons;
            return (
              <div
                key={rowIdx}
                className="flex"
                style={{ animation: `marquee-${row.dir} ${row.speed}s linear infinite` }}
              >
                {[...icons, ...icons].map((slug, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`r${rowIdx}-${i}`}
                    src={`https://cdn.simpleicons.org/${slug}/1a1a2e`}
                    alt=""
                    className="w-12 h-12 sm:w-16 sm:h-16 mx-8 sm:mx-12 shrink-0"
                    loading="lazy"
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: heading */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-text-light uppercase tracking-[0.3em] text-xs mb-6"
            >
              Tech Stack
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight"
            >
              Tools I work with{" "}
              <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                every day
              </span>
              <span className="text-accent">.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-text-muted text-lg font-light leading-relaxed max-w-md"
            >
              From frontend to cloud — the stack I reach for to ship fast and build things that last.
            </motion.p>
          </div>

          {/* Right: card swap */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            ref={containerRef}
            className="relative h-[360px] sm:h-[420px] lg:h-[460px] flex items-center justify-center"
            style={{ perspective: 900 }}
          >
            {/* Offset to visually center the stacked cards */}
            <div
              className="relative"
              style={{
                width: "var(--card-w)",
                height: "var(--card-h)",
                transform: "translate(var(--card-offset-x), var(--card-offset-y)) scale(var(--card-scale))",
              }}
            >
              {categories.map(([category, techs], i) => (
                <div
                  key={category}
                  ref={cardRefs.current[i]}
                  onClick={() => bringToFrontRef.current?.(i)}
                  className="absolute top-1/2 left-1/2 rounded-[1.5rem] border border-white/70 bg-white/90 backdrop-blur-xl cursor-pointer"
                  style={{
                    width: "var(--card-w)",
                    height: "var(--card-h)",
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    boxShadow:
                      "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  {/* Card header */}
                  <div className="px-5 pt-4 pb-3 sm:px-7 sm:pt-6 sm:pb-5">
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                      <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-accent/10 text-accent">
                        {categoryIcons[category]}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-text tracking-tight leading-none">
                          {category}
                        </h3>
                        <span className="text-[11px] text-text-light font-light">
                          {techs.length} tools
                        </span>
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
                  </div>

                  {/* Tech list */}
                  <div className="px-5 pb-4 sm:px-7 sm:pb-6 overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {techs.map((tech) => {
                        const slug = techIconSlug[tech];
                        const isAws = slug?.startsWith("aws:");
                        return (
                          <span
                            key={tech}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg bg-surface/60 border border-text/[0.04] text-[11px] sm:text-sm text-text-muted font-medium"
                          >
                            {slug && !isAws && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://cdn.simpleicons.org/${slug}/${ICON_COLOR}`}
                                alt=""
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"
                                loading="lazy"
                              />
                            )}
                            {isAws && (
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="#2563eb">
                                <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.374 6.18 6.18 0 0 1-.248-.47c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.392-.382-.591-.891-.591-1.525 0-.675.238-1.222.72-1.638.48-.415 1.119-.623 1.924-.623.267 0 .543.024.831.064.287.04.583.104.895.176v-.583c0-.603-.127-1.022-.375-1.261-.255-.24-.686-.358-1.3-.358-.28 0-.568.032-.863.104-.296.072-.583.16-.863.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.152c.95 0 1.644.216 2.091.647.44.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.343c0-.136.068-.208.207-.208h.783c.152 0 .256.024.32.08.063.048.112.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.024.32.08.064.048.12.16.152.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .32-.08h.743c.136 0 .208.064.208.208 0 .04-.008.08-.016.128a1.137 1.137 0 0 1-.056.216l-1.923 6.17c-.048.16-.104.264-.168.312a.52.52 0 0 1-.303.08h-.687c-.152 0-.256-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.272-.15.32-.064.056-.176.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.216-.151-.248-.223a.504.504 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.415-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.336-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.176 0 .36.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.072-1.062.223-.248.152-.375.383-.375.695 0 .224.08.416.24.567.16.152.454.304.87.44l1.133.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.97-9.722 2.97-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.271-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.384.606zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.216.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z" />
                              </svg>
                            )}
                            {tech}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
