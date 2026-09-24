import { PROJECTS } from "@/lib/data";
import { reelThemeCss } from "@/lib/theme";

/**
 * One [data-reel="slug"] rule of --reel-* tokens per project, rendered once by WorkSection. It is a
 * plain, unlayered <style>, so it beats any layered rule. The CSS is generated from data.ts hex values.
 */
export function ReelThemeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: reelThemeCss(PROJECTS) }} />;
}
