import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Props = ComponentProps<"span">;

/**
 * A small mono label. It reads the reel-scoped tokens: at night it sits close to --seat with ash
 * text, and inside a reel it takes the brand's muted ink on a faint ink tint.
 */
export function Chip({ className, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2.5 py-1 font-mono text-mono leading-none text-muted",
        className,
      )}
      {...props}
    />
  );
}
