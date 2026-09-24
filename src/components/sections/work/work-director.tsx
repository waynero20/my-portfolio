"use client";

import { useRef } from "react";

import { HouseLights } from "@/components/sections/work/house-lights";

import { useHouseLights } from "@/lib/hooks/useHouseLights";
import { useReelScenes } from "@/lib/hooks/useReelScenes";

import type { ReactNode } from "react";

interface Props {
  /** The server-rendered reels. */
  children: ReactNode;
}

/**
 * The Work section's one orchestrating island: it directs the reel scenes inside it and dips the
 * house lights as the scroll crosses its edges. Both hooks live here, in the component that owns the
 * root ref: a child's effects run before its parent's ref is attached. The scenes mark the root
 * data-directed once built (work.css keeps the cinema stages hidden until then).
 */
export function WorkDirector({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);
  useReelScenes(rootRef);
  useHouseLights(rootRef, lampRef);
  return (
    <div ref={rootRef} data-reels="">
      {children}
      <HouseLights lampRef={lampRef} />
    </div>
  );
}
