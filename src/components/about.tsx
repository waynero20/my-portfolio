"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

const stats = [
  { value: "6", label: "Products Shipped" },
  { value: "4", label: "Industries" },
  { value: "1", label: "Year Experience" },
];

export function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      id="about"
      className="relative w-full py-16 sm:py-20 px-8 sm:px-16 md:px-24"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[auto,1fr] gap-12 md:gap-16 items-center">
          {/* Gravatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="https://gravatar.com/avatar/waynerondina20?s=200&d=mp"
              alt="Wayne Rondina"
              width={140}
              height={140}
              className="rounded-full"
            />
          </motion.div>

          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-text-light uppercase tracking-[0.3em] text-xs mb-4"
            >
              About Me
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
            >
              Full-stack developer building{" "}
              <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                products people use
              </span>
              <span className="text-accent">.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-text-muted text-base leading-relaxed max-w-2xl"
            >
              I specialize in the modern React ecosystem — Next.js, TypeScript,
              and Tailwind CSS — backed by Supabase and cloud services. From
              e-commerce platforms to tutoring marketplaces to enterprise systems,
              I build across industries with a focus on clean UX, solid
              architecture, and shipping fast.
            </motion.p>
          </div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-12 mt-12 pt-8 border-t border-text/[0.06]"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-text">{stat.value}</div>
              <div className="text-xs text-text-light mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
