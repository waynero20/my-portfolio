import { ArrowUpRight } from "lucide-react";

import { brandMaskImage } from "@/components/ui/brand-icon";

import type { SOCIALS } from "@/lib/data";
import type { CssVars } from "@/lib/types";

import { cn } from "@/lib/utils";

type Social = (typeof SOCIALS)[number];

const TILE_CLASS =
  "social-xray relative inline-flex size-13 shrink-0 items-center justify-center rounded-lg border border-hairline bg-booth/70 transition-[border-color,background-color] duration-(--dur-micro) ease-settle hover:border-ash hover:bg-seat/80 motion-off:transition-none";

interface Props {
  social: Social;
  /** The only variant: kept so existing call sites (`variant="tile"`) still compile. */
  variant?: "tile";
  className?: string;
}

/**
 * A profile link as an x-ray tile: the brand mark alone in a 52px square, at rest a 1-bit ordered
 * dither of bone dots (the portrait's x-ray language). Hover or focus develops it coarse → fine to the
 * solid mark in its brand colour and shows the handle in mono with an arrow under the tile (styles
 * in src/styles/social-xray.css). The accessible name carries the network, the handle and the new
 * tab. Focus uses the global double ring.
 */
export function SocialCta({ social, className }: Props) {
  const { id, label, handle, href } = social;
  const markStyle: CssVars = { "--mark": brandMaskImage(id) };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${handle} (opens in a new tab)`}
      className={cn(TILE_CLASS, className)}
    >
      <span aria-hidden data-brand={id} className="social-xray-mark size-6" style={markStyle}>
        <span className="social-xray-dots" />
        <span className="social-xray-solid" />
      </span>
      <span aria-hidden className="social-xray-tip">
        {handle}
        <ArrowUpRight className="size-3" />
      </span>
    </a>
  );
}
