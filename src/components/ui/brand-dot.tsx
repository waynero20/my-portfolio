import type { CssVars, Hex } from "@/lib/types";

import { cn } from "@/lib/utils";

interface Props {
  color: Hex;
  className?: string;
}

/** A 10px decorative dot in a brand colour (a reel's nightDot). Size it with className. */
export function BrandDot({ color, className }: Props) {
  const style: CssVars = { "--dot": color };
  return (
    <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full bg-(--dot)", className)} style={style} />
  );
}
