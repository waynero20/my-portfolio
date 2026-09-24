import { Archive, Braces, Globe, ScanFace, ScanText } from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { ToolId } from "@/lib/types";

import { TOOL_ICONS } from "@/lib/generated/tool-icons";
import { cn } from "@/lib/utils";

/** Tools with no brand mark in Simple Icons (the AWS services were removed there): a Lucide pictogram. */
const FALLBACKS: Partial<Record<ToolId, LucideIcon>> = {
  cloudfront: Globe,
  rekognition: ScanFace,
  textract: ScanText,
  s3: Archive,
  "rest-apis": Braces,
};

const symbolId = (id: ToolId) => `tool-icon-${id}`;

interface SpriteProps {
  /** The tools whose marks the page shows; each path is emitted once. */
  ids: readonly ToolId[];
}

/**
 * The brand marks as one hidden SVG sprite, rendered once per page (WorkSection), so every chip
 * references a <symbol> instead of repeating its path.
 */
export function ToolIconSprite({ ids }: SpriteProps) {
  const unique = [...new Set(ids)].filter((id) => TOOL_ICONS[id]);
  return (
    <svg aria-hidden width="0" height="0" className="absolute size-0 overflow-hidden">
      {unique.map((id) => (
        <symbol key={id} id={symbolId(id)} viewBox="0 0 24 24">
          <path d={TOOL_ICONS[id]?.path} />
        </symbol>
      ))}
    </svg>
  );
}

interface Props {
  id: ToolId;
  className?: string;
}

/**
 * A tech-stack tool's logo in currentColor, decorative (the chip's text names the tool): its brand
 * mark from the sprite, or a Lucide pictogram for tools without one. Needs a ToolIconSprite on the page.
 */
export function ToolIcon({ id, className }: Props) {
  const Fallback = FALLBACKS[id];
  if (Fallback || !TOOL_ICONS[id]) {
    const Icon = Fallback ?? Braces;
    return <Icon aria-hidden strokeWidth={1.75} className={cn("size-3.5 shrink-0", className)} />;
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={cn("size-3.5 shrink-0", className)}>
      <use href={`#${symbolId(id)}`} />
    </svg>
  );
}
