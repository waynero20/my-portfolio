import Image from "next/image";
import { cva } from "class-variance-authority";

import type { VariantProps } from "class-variance-authority";
import type { CssVars, Hex, ReelSlug } from "@/lib/types";

import { cn } from "@/lib/utils";

const tileVariants = cva(
  "inline-grid shrink-0 place-items-center overflow-hidden bg-(--logo-surface) ring-1 ring-bone/15",
  {
    variants: {
      size: {
        /** Call sheet column headers: fits a 26px column on a 360px phone. */
        xs: "size-[22px] rounded-[5px] p-[2px] lg:size-7 lg:rounded-md lg:p-[3px]",
        sm: "size-8 rounded-md p-1",
        md: "size-10 rounded-lg p-1.5",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

/** The tile's largest rendered width per size, for next/image's `sizes`. */
const SIZES = { xs: "28px", sm: "32px", md: "40px" } as const;

interface Props extends VariantProps<typeof tileVariants> {
  slug: ReelSlug;
  /** The brand's surface colour: the tile is the project's own room in miniature. */
  surface: Hex;
  /** Alt text. Empty (decorative) by default: the link or header around it carries the name. */
  alt?: string;
  className?: string;
}

/**
 * A project's logo mark on a small tile in the brand's surface colour. It stands in for the coloured
 * dots that used to mark projects (Wayne's W12). The marks are trimmed squares built by
 * `npm run assets:logos` into public/logos/marks/.
 */
export function ProjectLogo({ slug, surface, alt = "", size, className }: Props) {
  const style: CssVars = { "--logo-surface": surface };
  return (
    <span className={cn(tileVariants({ size }), className)} style={style}>
      <Image
        src={`/logos/marks/${slug}.webp`}
        alt={alt}
        width={160}
        height={160}
        sizes={SIZES[size ?? "sm"]}
        className="size-full object-contain"
      />
    </span>
  );
}
