// The call sheet's table model: which tools shipped in which projects. Pure, with no DOM or React.

import type { CallSheet, CallSheetGroup, CallSheetRow, Project, StackLayer, Tool, ToolId } from "@/lib/types";

/** The <tbody> order, top to bottom, with each layer's row-group label. */
export const STACK_LAYERS: readonly { layer: StackLayer; label: string }[] = [
  { layer: "framework", label: "Framework" },
  { layer: "interface", label: "Interface" },
  { layer: "data", label: "Data" },
  { layer: "content", label: "Content" },
  { layer: "cloud", label: "Cloud" },
];

/**
 * Builds the call sheet from the projects (the columns, in order) and the tool registry.
 * - A row is a tool that at least one project shipped with; tools no project uses (the everyday
 *   kit) are left out, so the grid never shows an empty row.
 * - Rows are grouped by layer in STACK_LAYERS order, most-used first, then in registry order.
 * - Each column's total counts its ticks.
 * Throws if a project's stack names a tool the registry lacks: a silent gap would under-count.
 */
export function buildCallSheet(projects: readonly Project[], tools: readonly Tool[]): CallSheet {
  const known = new Set<ToolId>(tools.map(({ id }) => id));
  for (const { title, stack } of projects) {
    const unknown = stack.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`${title} lists tools missing from TOOLS: ${unknown.join(", ")}`);
  }

  const rows: CallSheetRow[] = tools.flatMap((tool) => {
    const cells = projects.map(({ stack }) => stack.includes(tool.id));
    const count = cells.filter(Boolean).length;
    return count > 0 ? [{ tool, cells, count }] : [];
  });

  const groups: CallSheetGroup[] = STACK_LAYERS.flatMap(({ layer, label }) => {
    // Array.prototype.sort is stable, so equal counts keep registry order.
    const layerRows = rows.filter(({ tool }) => tool.layer === layer).sort((a, b) => b.count - a.count);
    return layerRows.length > 0 ? [{ layer, label, rows: layerRows }] : [];
  });

  const columns = projects.map(({ slug, abbr, title, theme }, index) => ({
    slug,
    abbr,
    title,
    surface: theme.surface,
    nightDot: theme.nightDot,
    total: rows.filter(({ cells }) => cells[index]).length,
  }));

  return { columns, groups };
}

/** The registry entries for `ids`, in the order given (the everyday kit row). Unknown ids are dropped. */
export function pickTools(tools: readonly Tool[], ids: readonly ToolId[]): Tool[] {
  return ids.flatMap((id) => tools.filter((tool) => tool.id === id));
}
