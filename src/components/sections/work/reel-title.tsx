import type { CssVars, Hex, ReelSlug, TitleFont, TypecastPreset } from "@/lib/types";

import { cn } from "@/lib/utils";
import { presetVars } from "@/lib/work/typecast-presets";

interface Props {
  id?: string;
  slug: ReelSlug;
  title: string;
  /** The night face's axes: the title rests in them until its reel floods (NIGHT_TYPECAST). */
  night: TypecastPreset;
  /** The brand's own display face, which the title is re-cast in once its reel floods. */
  font: TitleFont;
  /** A two-stop brand fill for the glyphs (Tampus gold), in both faces. */
  gradient?: readonly [Hex, Hex];
  className?: string;
}

/**
 * A reel title that is re-cast in its brand's face: an <h3 data-typecast> in a reserved box
 * (work.css) holding the title twice, stacked on one baseline. The night face (Google Sans Flex at
 * the night axes) is the heading's text and accessible name; the brand face (the --ff-title-{slug}
 * subset from src/lib/fonts.ts, at the brand's weight, style, case and tracking) is a hidden copy
 * that createCasts() arms once its font has loaded, then wipes in when the flood completes.
 */
export function ReelTitle({ id, slug, title, night, font, gradient, className }: Props) {
  const style: CssVars = {
    ...presetVars(night),
    "--title-ff": `var(--ff-title-${slug})`,
    "--title-weight": font.weight,
    "--title-style": font.style,
    "--title-case": font.textCase === "upper" ? "uppercase" : "none",
    "--title-tracking": `${font.trackingEm ?? 0}em`,
    ...(gradient && { "--title-from": gradient[0], "--title-to": gradient[1] }),
  };

  return (
    <div className={cn("reel-title-box", className)}>
      <h3
        id={id}
        data-typecast=""
        className={cn("reel-title", gradient && "reel-title-gradient")}
        style={style}
      >
        <span data-title-face="night" className="reel-title-night axes">
          {title}
        </span>
        <span data-title-face="brand" aria-hidden className="reel-title-brand">
          {title}
        </span>
      </h3>
    </div>
  );
}
