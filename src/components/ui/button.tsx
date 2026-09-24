import { cva } from "class-variance-authority";

import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Colours come from the reel-scoped tokens, so a button is tungsten at night and takes the brand's
 * CTA colours inside a reel or on the re-graded nav. Focus uses the global double ring.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-colors duration-(--dur-micro) ease-settle disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      intent: {
        primary: "rounded-lg bg-cta text-cta-ink hover:bg-cta/90",
        outline: "rounded-lg border border-muted text-ink hover:border-ink",
        pill: "rounded-full border border-cta text-ink hover:bg-cta hover:text-cta-ink",
      },
      size: {
        sm: "h-9 px-4 text-mono",
        md: "h-11 px-5 text-body",
        lg: "h-13 px-7 text-body-lg",
      },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface LinkProps extends ComponentProps<"a">, ButtonVariants {
  href: string;
}

interface NativeButtonProps extends ComponentProps<"button">, ButtonVariants {
  href?: undefined;
}

type Props = LinkProps | NativeButtonProps;

/** Renders an <a> when given an href, otherwise a <button type="button">. */
export function Button(props: Props) {
  if (props.href !== undefined) {
    const { intent, size, className, ...link } = props;
    return <a className={cn(buttonVariants({ intent, size }), className)} {...link} />;
  }
  const { intent, size, className, type = "button", ...button } = props;
  return <button type={type} className={cn(buttonVariants({ intent, size }), className)} {...button} />;
}
