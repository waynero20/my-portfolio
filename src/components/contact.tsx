"use client";

import { motion, useInView, AnimatePresence, animate } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { socials } from "@/lib/data";

/* ── Phone number config ── */

const PHONE_DISPLAY = "0949 871 8967";
const DIAL_SEQUENCE = PHONE_DISPLAY.replace(/\s/g, "").split("");
const TOTAL_DIGITS = DIAL_SEQUENCE.length;

function getDisplayText(dialIndex: number): string {
  if (dialIndex === 0) return "";
  let count = 0;
  for (let i = 0; i < PHONE_DISPLAY.length; i++) {
    if (PHONE_DISPLAY[i] !== " ") {
      count++;
      if (count === dialIndex) return PHONE_DISPLAY.slice(0, i + 1);
    }
  }
  return PHONE_DISPLAY;
}

/* ── Keypad layout ── */

const keypadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const keyLetters: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

/* ── Socials ── */

const socialLinks = [
  {
    label: "GitHub",
    href: socials.github,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: socials.linkedin,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: socials.facebook,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: socials.instagram,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: "Gravatar",
    href: socials.gravatar,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6a4.8 4.8 0 110 9.6 4.8 4.8 0 010-9.6zm0 17.04a8.64 8.64 0 01-7.2-3.864c.036-2.388 4.8-3.696 7.2-3.696 2.388 0 7.164 1.308 7.2 3.696A8.64 8.64 0 0112 20.64z" />
      </svg>
    ),
  },
];

/* ── Ripple types ── */

type Ripple = { id: number; x: number; y: number; kind: "fill" | "ring" | "ring-slow" };
let rippleId = 0;

/* ── Keypad button with distort + highlight ── */

function DialKey({
  value,
  letters,
  onPress,
  disabled,
  highlighted,
}: {
  value: string;
  letters?: string;
  onPress: (btn: HTMLButtonElement) => void;
  disabled: boolean;
  highlighted: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (disabled || !btnRef.current) return;
    onPress(btnRef.current);

    animate(
      btnRef.current,
      {
        scale: [1, 0.68, 1.18, 0.96, 1],
        rotate: [0, -6, 4, -1.5, 0],
        skewX: ["0deg", "-10deg", "5deg", "-1deg", "0deg"],
      },
      { duration: 0.45, ease: "easeOut" }
    );
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative
        w-16 h-16 sm:w-[72px] sm:h-[72px] md:w-20 md:h-20
        glass rounded-2xl
        flex flex-col items-center justify-center
        select-none transition-all duration-150
        ${
          disabled
            ? "opacity-30 cursor-default"
            : "cursor-pointer hover:bg-glass-hover hover:shadow-md active:shadow-sm"
        }
      `}
    >
      {/* Pulsing highlight ring for the next key */}
      {highlighted && (
        <motion.span
          className="absolute pointer-events-none border-2 border-accent"
          style={{
            inset: -2,
            borderRadius: "calc(1.5rem + 2px)",
          }}
          animate={{
            opacity: [0.4, 1, 0.4],
            boxShadow: [
              "0 0 0px rgba(37,99,235,0)",
              "0 0 20px rgba(37,99,235,0.4)",
              "0 0 0px rgba(37,99,235,0)",
            ],
          }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="relative z-10 text-xl sm:text-2xl font-semibold text-text leading-none">
        {value}
      </span>
      {letters && (
        <span className="relative z-10 text-[8px] sm:text-[9px] tracking-[0.15em] text-text-light mt-1 leading-none">
          {letters}
        </span>
      )}
    </button>
  );
}

/* ── Contact section ── */

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const [dialIndex, setDialIndex] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const isComplete = dialIndex >= TOTAL_DIGITS;
  const displayText = getDisplayText(dialIndex);
  const nextDigit = isComplete ? null : DIAL_SEQUENCE[dialIndex];

  const handleKeyPress = useCallback(
    (btn: HTMLButtonElement) => {
      if (!sectionRef.current) return;
      setDialIndex((prev) => Math.min(prev + 1, TOTAL_DIGITS));

      const sectionRect = sectionRef.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const x = btnRect.left + btnRect.width / 2 - sectionRect.left;
      const y = btnRect.top + btnRect.height / 2 - sectionRect.top;

      // Spawn 3 ripples: filled blob + fast ring + slower ring
      const base = ++rippleId;
      const newRipples: Ripple[] = [
        { id: base, x, y, kind: "fill" },
        { id: base + 1, x, y, kind: "ring" },
        { id: base + 2, x, y, kind: "ring-slow" },
      ];
      rippleId = base + 2;

      setRipples((prev) => [...prev, ...newRipples]);
      setTimeout(() => {
        setRipples((prev) =>
          prev.filter((r) => r.id !== base && r.id !== base + 1 && r.id !== base + 2)
        );
      }, 1400);
    },
    []
  );

  const handleReset = useCallback(() => {
    setDialIndex(0);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative min-h-[100dvh] flex items-center justify-center px-6 overflow-hidden"
    >
      {/* Background ripple layer */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {ripples.map((ripple) => {
            if (ripple.kind === "fill") {
              return (
                <motion.div
                  key={ripple.id}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute rounded-full"
                  style={{
                    width: "140vmax",
                    height: "140vmax",
                    left: ripple.x,
                    top: ripple.y,
                    x: "-50%",
                    y: "-50%",
                    background:
                      "radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(37,99,235,0.12) 25%, rgba(37,99,235,0.03) 50%, transparent 65%)",
                  }}
                />
              );
            }

            // Ring ripples — an expanding circle outline
            const isSlow = ripple.kind === "ring-slow";
            return (
              <motion.div
                key={ripple.id}
                initial={{ scale: 0, opacity: isSlow ? 0.6 : 0.8 }}
                animate={{ scale: 1, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: isSlow ? 1.3 : 0.85,
                  ease: "easeOut",
                  delay: isSlow ? 0.15 : 0,
                }}
                className="absolute rounded-full"
                style={{
                  width: isSlow ? "100vmax" : "120vmax",
                  height: isSlow ? "100vmax" : "120vmax",
                  left: ripple.x,
                  top: ripple.y,
                  x: "-50%",
                  y: "-50%",
                  border: `2px solid rgba(37,99,235,${isSlow ? "0.25" : "0.35"})`,
                  boxShadow: `0 0 ${isSlow ? "12" : "20"}px rgba(37,99,235,${isSlow ? "0.08" : "0.12"})`,
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-text-muted text-base sm:text-lg mb-3 sm:mb-4 font-light tracking-wide"
        >
          Ready to start?
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-10 leading-tight tracking-tight"
        >
          Dial me in<span className="text-accent">.</span>
        </motion.h2>

        {/* Keypad area */}
        <div className="inline-flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div
                key="keypad"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex flex-col items-center gap-4 sm:gap-5"
              >
                {/* Number display */}
                <div className="glass-strong px-8 py-4 min-w-[280px] sm:min-w-[340px]">
                  <div className="text-2xl sm:text-3xl font-mono font-semibold tracking-[0.15em] min-h-[40px] flex items-center justify-center">
                    {displayText ? (
                      <>
                        <span className="text-text">{displayText}</span>
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="inline-block w-[2px] h-7 bg-accent ml-1"
                        />
                      </>
                    ) : (
                      <span className="text-text-light/40 text-sm font-sans font-normal tracking-normal">
                        Tap any key to dial
                      </span>
                    )}
                  </div>
                </div>

                {/* Keypad grid */}
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {keypadRows.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-2.5 sm:gap-3 justify-center">
                      {row.map((key) => (
                        <DialKey
                          key={key}
                          value={key}
                          letters={keyLetters[key]}
                          onPress={handleKeyPress}
                          disabled={isComplete}
                          highlighted={key === nextDigit}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-flex flex-col items-center gap-6"
              >
                {/* Dialed number */}
                <div className="glass-strong px-8 py-4 min-w-[280px] sm:min-w-[340px] shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                  <div className="text-2xl sm:text-3xl font-mono font-semibold tracking-[0.15em] min-h-[40px] flex items-center justify-center">
                    <span className="text-green-500">{PHONE_DISPLAY}</span>
                  </div>
                </div>

                {/* Call Now button */}
                <motion.a
                  href={socials.phone}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 22,
                    delay: 0.15,
                  }}
                  className="inline-flex items-center gap-3 px-10 py-5 bg-green-500 text-white font-semibold rounded-full text-lg tracking-wide hover:bg-green-400 transition-colors shadow-lg shadow-green-500/25"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call Now
                </motion.a>

                {/* Redial */}
                <button
                  onClick={handleReset}
                  className="text-xs text-text-light hover:text-accent transition-colors cursor-pointer"
                >
                  Tap to redial
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 sm:mt-10 flex items-center justify-center gap-3"
        >
          <span className="text-text-light text-sm">or reach me at</span>
          <a
            href={socials.email}
            className="text-sm text-accent hover:text-accent-light transition-colors font-medium"
          >
            waynerondina20@gmail.com
          </a>
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 sm:mt-6 flex items-center justify-center gap-5"
        >
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-light hover:text-accent transition-colors duration-200"
              aria-label={link.label}
            >
              {link.icon}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
