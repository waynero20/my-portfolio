// The Services rows' view model, built from SERVICES and PROJECTS by services-section.tsx and handed
// to the ServiceRows island as props.

import type { Hex, ReelSlug } from "./content";

/** A project link in an opened service row: the reel's slug, its title and its brand surface (the logo tile). */
export interface ServiceReel {
  slug: ReelSlug;
  title: string;
  surface: Hex;
}

/** One service row: its word id, title, deliverables and the projects it can be seen in. */
export interface ServiceRowItem {
  id: string;
  title: string;
  deliverables: readonly string[];
  reels: readonly ServiceReel[];
}
