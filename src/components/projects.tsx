"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { projects, type Project } from "@/lib/data";

/* ── Per-project style config ── */

type ProjectStyle = {
  bg: string;
  titleCls: string;
  taglineCls: string;
  videoCls: string;
  logo: string;
  logoSize: number;
  video: string;
  layout: "left" | "right";
  entrance: { x: number; y: number };
  overlay?: string;
  overlayOpacity?: string;
  url?: string;
  btnCls?: string;
};

const styles: Record<string, ProjectStyle> = {
  "Natural Athlete": {
    bg: "bg-[#0A0A0A]",
    titleCls: "text-white text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-wider",
    taglineCls: "text-white/40 uppercase tracking-[0.3em] text-xs",
    videoCls: "rounded-2xl",
    logo: "/logos/ntrl-athlete.webp",
    logoSize: 120,
    video: "/videos/naturalathlete.mp4",
    layout: "right",
    entrance: { x: 0, y: 100 },
    overlay: "/overlays/naturalathlete.webp",
    overlayOpacity: "opacity-[0.08]",
    url: "https://staging.ntrl-athlete.com",
    btnCls: "bg-white text-black hover:bg-white/90",
  },
  "Bloom & Blossom": {
    bg: "bg-[#FAF7F2]",
    titleCls: "text-[#2F5D50] text-4xl sm:text-5xl md:text-6xl font-bold italic",
    taglineCls: "text-[#E8A7A7] uppercase tracking-[0.3em] text-xs font-medium",
    videoCls: "rounded-[1.5rem]",
    logo: "/logos/bloomandblossom.webp",
    logoSize: 100,
    video: "/videos/bloomandblossom.mp4",
    layout: "left",
    entrance: { x: -120, y: 0 },
    overlay: "/overlays/bloomandblossom.webp",
    overlayOpacity: "opacity-[0.06]",
    url: "https://bloomandblossom-two.vercel.app/",
    btnCls: "bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90",
  },
  "Legacy Smiles": {
    bg: "bg-white",
    titleCls: "text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#3D00FF] to-[#6294E9] bg-clip-text text-transparent pb-2 leading-tight",
    taglineCls: "text-[#6294E9]/60 uppercase tracking-[0.3em] text-xs font-medium",
    videoCls: "rounded-2xl shadow-xl shadow-[#6294E9]/10",
    logo: "/logos/legacysmiles.webp",
    logoSize: 80,
    video: "/videos/legacysmiles.mp4",
    layout: "right",
    entrance: { x: 120, y: 0 },
    overlay: "/overlays/legacysmilesnew.webp",
    overlayOpacity: "opacity-[0.05]",
    url: "http://legacysmiles.ph/",
    btnCls: "bg-gradient-to-r from-[#3D00FF] to-[#6294E9] text-white hover:opacity-90",
  },
  "Tampus Dental": {
    bg: "bg-[#002333]",
    titleCls: "text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#C49528] via-[#D4A535] to-[#E6BB4A] bg-clip-text text-transparent pb-2 leading-tight",
    taglineCls: "text-[#D4A535]/50 uppercase tracking-[0.3em] text-xs font-medium",
    videoCls: "rounded-2xl",
    logo: "/logos/tadocweb.webp",
    logoSize: 120,
    video: "/videos/tampusdentalclinic.mp4",
    layout: "left",
    entrance: { x: 0, y: -100 },
    overlay: "/overlays/tampusdental.webp",
    overlayOpacity: "opacity-[0.10]",
    url: "https://www.tampusdental.com/",
    btnCls: "bg-gradient-to-r from-[#C49528] to-[#E6BB4A] text-[#002333] font-semibold hover:opacity-90",
  },
  TutorLoop: {
    bg: "bg-[#f8f7ff]",
    titleCls: "text-indigo-900 text-4xl sm:text-5xl md:text-6xl font-bold",
    taglineCls: "text-amber-500/70 uppercase tracking-[0.3em] text-xs font-semibold",
    videoCls: "rounded-[1.5rem]",
    logo: "/logos/tutorloop.webp",
    logoSize: 120,
    video: "/videos/tutorformystudent.mp4",
    layout: "right",
    entrance: { x: 80, y: 60 },
    overlay: "/overlays/tutorloop.webp",
    overlayOpacity: "opacity-[0.06]",
    url: "https://www.tutorformystudent.com/",
    btnCls: "bg-indigo-900 text-white hover:bg-indigo-800",
  },
  "Horizon ERP": {
    bg: "bg-white",
    titleCls: "text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#045c2b] to-[#f15c01] bg-clip-text text-transparent pb-2 leading-tight",
    taglineCls: "text-[#045c2b]/40 uppercase tracking-[0.3em] text-xs font-medium",
    videoCls: "rounded-2xl shadow-lg shadow-[#045c2b]/10",
    logo: "/logos/horizonerp.webp",
    logoSize: 100,
    video: "/videos/horizon-erp.mp4",
    layout: "left",
    entrance: { x: -80, y: 60 },
    overlay: "/overlays/horizonerp.webp",
    overlayOpacity: "opacity-[0.05]",
  },
};

/* ── Project display (full-width, minimal) ── */

const showVisitBtn = new Set(["E-COMMERCE", "SEO", "MARKETPLACE"]);

function ProjectDisplay({ project }: { project: Project }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const s = styles[project.title];
  if (!s) return null;

  const isLeft = s.layout === "left";
  const hasBtn = showVisitBtn.has(project.category) && s.url;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: s.entrance.x, y: s.entrance.y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={`${s.bg} relative w-full py-16 sm:py-24 px-8 sm:px-16 md:px-24 overflow-hidden`}
    >
      {/* Overlay background image */}
      {s.overlay && (
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={s.overlay}
            alt=""
            fill
            className={`object-cover ${s.overlayOpacity ?? "opacity-[0.06]"}`}
            sizes="100vw"
            priority={false}
          />
        </div>
      )}

      <div className={`relative z-10 grid md:grid-cols-2 gap-12 md:gap-20 items-center max-w-[1400px] mx-auto`}>
        <div className={isLeft ? "md:order-2" : ""}>
          <Image
            src={s.logo}
            alt={`${project.title} logo`}
            width={s.logoSize}
            height={s.logoSize}
            className="mb-8 object-contain w-auto h-auto"
          />
          <p className={`${s.taglineCls} mb-4`}>{project.tagline}</p>
          <h3 className={s.titleCls}>{project.title}</h3>

          {hasBtn && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${s.btnCls}`}
            >
              Visit Website
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          )}
        </div>

        <div className={isLeft ? "md:order-1" : ""}>
          <video
            src={s.video}
            autoPlay
            loop
            muted
            playsInline
            className={`${s.videoCls} w-full aspect-video object-cover`}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main ── */

export function Projects() {
  return (
    <section id="projects" className="relative">
      {projects.map((project) => (
        <ProjectDisplay key={project.title} project={project} />
      ))}
    </section>
  );
}
