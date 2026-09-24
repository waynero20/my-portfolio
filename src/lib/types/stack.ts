// The call sheet's table model, built by buildCallSheet() in src/lib/call-sheet.ts. Plain data, so a
// server component can build it and hand it to the CallSheet island as props.

import type { Hex, ReelSlug, StackLayer, Tool } from "./content";

/** One project column, in PROJECTS order. */
export interface CallSheetColumn {
  slug: ReelSlug;
  abbr: string;
  title: string;
  /** The brand's surface: the column's logo tile (W12: logos, not dots). */
  surface: Hex;
  /** The brand's night colour: the haze tint while the column is previewed. */
  nightDot: Hex;
  /** How many of the grid's tools this project shipped with: the column's total in <tfoot>. */
  total: number;
}

/** One tool row. `cells` has one flag per column, in column order: did that project ship with it? */
export interface CallSheetRow {
  tool: Tool;
  cells: readonly boolean[];
  count: number;
}

/** One <tbody>: a layer's tools, most-used first. */
export interface CallSheetGroup {
  layer: StackLayer;
  label: string;
  rows: readonly CallSheetRow[];
}

export interface CallSheet {
  columns: readonly CallSheetColumn[];
  groups: readonly CallSheetGroup[];
}
