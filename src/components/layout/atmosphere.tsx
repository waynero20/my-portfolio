import { cn } from "@/lib/utils";

/**
 * The room's backdrop: a fixed layer behind all content (z-index var(--z-atmo)) holding a static CSS
 * pool of tungsten light, centred where the hero's head sits (mid-frame on phones, right of WAYNE from
 * lg), so the lamp reads as behind the portrait. The pool is tungsten at 14% over blackout at its
 * brightest, so it never passes luminance 0.035: about 0.015, where ash still reads at 5.9:1. Body
 * paints the page background; this layer only adds light. The M5 shader canvas mounts inside it.
 */
export function Atmosphere() {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-(--z-atmo)",
        "bg-radial-[ellipse_95%_45%_at_50%_34%] from-tungsten/14 to-transparent to-70%",
        "lg:bg-radial-[ellipse_60%_62%_at_74%_36%]",
      )}
    />
  );
}
