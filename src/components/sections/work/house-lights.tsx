"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { RefObject } from "react";

interface Props {
  /** The booth wash, for useHouseLights (run by WorkDirector, which owns Work's root ref). */
  lampRef: RefObject<HTMLDivElement | null>;
}

const subscribeNever = () => () => undefined;
const getFxRoot = () => document.getElementById("fx-root");
const getNoRoot = () => null;

/**
 * The house lights: a fixed booth wash, portaled into #fx-root (fixed layers never live inside
 * sections), at opacity 0 until useHouseLights dips it on entering or leaving Work. Decorative;
 * the server and the hydrating client render nothing, then the portal mounts.
 */
export function HouseLights({ lampRef }: Props) {
  const fxRoot = useSyncExternalStore(subscribeNever, getFxRoot, getNoRoot);
  if (!fxRoot) return null;
  return createPortal(
    <div ref={lampRef} aria-hidden className="pointer-events-none fixed inset-0 z-(--z-dip) bg-booth opacity-0" />,
    fxRoot,
  );
}
