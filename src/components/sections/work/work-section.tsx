import { ToolIconSprite } from "@/components/ui/tool-icon";
import { Reel } from "@/components/sections/work/reel";
import { ReelThemeStyles } from "@/components/sections/work/reel-theme-styles";
import { WorkDirector } from "@/components/sections/work/work-director";

import { getMedia } from "@/lib/content";
import { PROJECTS } from "@/lib/data";

/**
 * Selected work: "The Screen Becomes the Room". No intro card (Wayne's W10): the showcase starts right
 * after the hero, and the heading is for assistive tech only. All seven reels in PROJECTS order, inside WorkDirector (the client island that runs their hand-offs and the house
 * lights). ReelThemeStyles emits every reel's --reel-* tokens once, and ToolIconSprite every stack
 * logo the reels' chips reference.
 */
export function WorkSection() {
  return (
    <section
      id="work"
      data-section=""
      data-lighting-cue="work"
      aria-labelledby="work-title"
    >
      <h2 id="work-title" className="sr-only">
        Selected work
      </h2>
      <ReelThemeStyles />
      <ToolIconSprite ids={PROJECTS.flatMap((project) => project.stack)} />
      <WorkDirector>
        {PROJECTS.map((project, index) => (
          <Reel key={project.slug} project={project} index={index} total={PROJECTS.length} media={getMedia(project.slug)} />
        ))}
      </WorkDirector>
    </section>
  );
}
