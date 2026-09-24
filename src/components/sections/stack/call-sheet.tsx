"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { ProjectLogo } from "@/components/ui/project-logo";

import { atmosphere } from "@/lib/atmosphere";

import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { CallSheet as CallSheetModel, CallSheetColumn, ReelSlug, Tool, ToolId } from "@/lib/types";

import { DURATION } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

interface Props {
  sheet: CallSheetModel;
  /** The everyday kit: one row, no per-project claims. */
  kit: readonly Tool[];
  caption: string;
}

const WHY_ID = "call-sheet-why";

/** The nearest `data-*` value on or above the event's target, inside the table. */
function closestData(target: EventTarget, key: "col" | "tool"): string | null {
  if (!(target instanceof Element)) return null;
  const attribute = key === "col" ? "data-col" : "data-tool";
  return target.closest<HTMLElement>(`[${attribute}]`)?.getAttribute(attribute) ?? null;
}

/**
 * The call sheet: a semantic table of tools (rows, grouped by layer) against the seven projects
 * (columns). Interactions, none of which move a row:
 * - A column header (the project's logo on its brand tile) is a toggle (aria-pressed) that pins its
 *   column: that project's ticks stay lit, the others dim, and the tool column's header shows the
 *   project's name. With a fine pointer, hovering a column previews it the same way and tints the
 *   haze with the brand's night colour;
 *   leaving hands the lighting back to the stack cue.
 * - Hovering a row, focusing its tool (keyboard) or tapping it shows the tool's "why" line in one
 *   bar that floats 16px above the bottom of the screen while the table runs past it, and docks in
 *   its slot under the table otherwise. A tool with no line shows nothing. A picked line goes away
 *   when its row scrolls out of sight, on a tap or click outside the table, on Escape, when focus
 *   leaves the table, or on a second tap of the same row.
 */
export function CallSheet({ sheet, kit, caption }: Props) {
  const { columns, groups } = sheet;
  const [pinned, setPinned] = useState<ReelSlug | null>(null);
  const [preview, setPreview] = useState<ReelSlug | null>(null);
  const [hoverTool, setHoverTool] = useState<ToolId | null>(null);
  const [pickedTool, setPickedTool] = useState<ToolId | null>(null);
  const [stuck, setStuck] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  // Whether the stack section holds the middle of the screen, so the lighting is its to steer. A
  // late pointerleave (after a wheel scroll into Contact) must not hand the haze back to "stack".
  const ownsCue = useRef(false);

  // The header row is sticky. It only needs a solid background (to hide the rows scrolling under it)
  // while it is actually stuck: while the table spans the top edge of the screen. The observer's root
  // is shrunk to that edge (a zero-height line), so the table "intersects" exactly then; at rest the
  // haze shows through the header like everywhere else.
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setStuck(entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: "0px 0px -100% 0px" },
    );
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  // The same zero-height-line trick at the middle of the screen, on the section.
  useEffect(() => {
    const section = tableRef.current?.closest("[data-lighting-cue]");
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) ownsCue.current = entry.isIntersecting;
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // A picked line belongs to its row: it goes away once the row has left the screen (or slid fully
  // under the stuck header), so a tapped card doesn't ride over the rest of the table, and on a tap
  // or click anywhere outside the table. A scroll gesture ends in pointercancel, not pointerup, so
  // only a real tap outside dismisses.
  useEffect(() => {
    const table = tableRef.current;
    if (!pickedTool || !table) return;
    const row = table.querySelector(`[data-tool="${CSS.escape(pickedTool)}"]`);
    const headHeight = Math.round(table.tHead?.getBoundingClientRect().height ?? 0);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry && !entry.isIntersecting) setPickedTool(null);
      },
      { rootMargin: `-${headHeight}px 0px 0px 0px` },
    );
    if (row) observer.observe(row);
    const onPointerUp = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && table.contains(event.target)) return;
      setPickedTool(null);
    };
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [pickedTool]);

  const rows = groups.flatMap((group) => group.rows);
  const tools = [...rows.map(({ tool }) => tool), ...kit];
  // Kit tools with a "why" line (the pills) first, the plain labels after them.
  const kitShown = [...kit.filter((tool) => tool.why), ...kit.filter((tool) => !tool.why)];
  const findColumn = (slug: string | null) => columns.find((column) => column.slug === slug) ?? null;
  const findTool = (id: string | null) => tools.find((tool) => tool.id === id) ?? null;

  const focusCol = preview ?? pinned;
  const focusColumn = findColumn(focusCol);
  const shownId = hoverTool ?? pickedTool;
  const shownTool = findTool(shownId);
  const shownWhy = shownTool?.why ?? null;
  const shownRow = rows.find(({ tool }) => tool.id === shownId);

  // The local preview always follows the pointer; the haze only while this section owns the cue.
  const previewColumn = (column: CallSheetColumn | null) => {
    if ((column?.slug ?? null) === preview) return;
    setPreview(column?.slug ?? null);
    if (!ownsCue.current) return;
    if (column) atmosphere.setCue({ tint: column.nightDot }, { duration: DURATION.ui });
    else atmosphere.setCue("stack");
  };

  // Hover (mouse only: touch and pen have no hover, they tap). Anything that isn't a tool (a column
  // header, a group label, the totals) drops the hovered line, so the picked one shows again. Only a
  // real move counts: while the wheel scrolls rows under a still mouse, Chrome sends synthetic moves
  // with no movement, which would pop the card up row after row.
  const onPointerMove = (event: PointerEvent<HTMLTableElement>) => {
    if (event.pointerType !== "mouse" || (event.movementX === 0 && event.movementY === 0)) return;
    previewColumn(findColumn(closestData(event.target, "col")));
    setHoverTool(findTool(closestData(event.target, "tool"))?.id ?? null);
  };

  const onPointerLeave = (event: PointerEvent<HTMLTableElement>) => {
    if (event.pointerType !== "mouse") return;
    previewColumn(null);
    setHoverTool(null);
  };

  // A tap or click anywhere on a tool's row picks it; again unpicks it. Enter or Space on a tool's
  // button (a click with no pointer, detail 0) only shows the line: focus has already picked it,
  // so toggling would hide the line the key was pressed for.
  const onClick = (event: MouseEvent<HTMLTableElement>) => {
    const tool = findTool(closestData(event.target, "tool"));
    if (!tool) return;
    if (event.detail === 0) setPickedTool(tool.id);
    else setPickedTool((current) => (current === tool.id ? null : tool.id));
  };

  // Keyboard focus picks the tool, so tabbing down the rows reads each line. A mouse press focuses
  // the button too (not :focus-visible); its click handles that case.
  const onFocus = (event: FocusEvent<HTMLTableElement>) => {
    if (!(event.target instanceof HTMLElement) || !event.target.matches(":focus-visible")) return;
    const tool = findTool(event.target.getAttribute("data-tool-button"));
    if (tool) setPickedTool(tool.id);
  };

  // Focus moving on to something outside the table takes the line with it (a window or tab switch
  // has no relatedTarget and keeps it).
  const onBlur = (event: FocusEvent<HTMLTableElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) setPickedTool(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.key === "Escape" && pickedTool) setPickedTool(null);
  };

  const isDim = (slug: ReelSlug) => focusCol !== null && focusCol !== slug;

  return (
    <div className="call-sheet" data-stuck={stuck || undefined}>
      <table
        ref={tableRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="w-full table-fixed border-collapse text-left"
      >
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[44%]" />
          {columns.map(({ slug }) => (
            <col key={slug} className="w-[8%]" />
          ))}
        </colgroup>

        <thead>
          <tr>
            {/* Visually the pinned or previewed project's name stands in for "Tool", so the stuck
                header still says whose column is lit after the key has scrolled away. */}
            <th
              scope="col"
              className="call-sheet-head pr-2 pb-3 pl-2 align-bottom font-mono text-[0.6875rem] font-normal tracking-[0.08em] uppercase lg:pl-3 lg:text-mono"
            >
              <span className="sr-only">Tool</span>
              <span aria-hidden className={cn("block truncate", focusColumn ? "text-tungsten" : "text-ash")}>
                {focusColumn?.title ?? "Tool"}
              </span>
            </th>
            {columns.map((column) => {
              const { slug, title, surface } = column;
              const isFocus = focusCol === slug;
              return (
                <th
                  key={slug}
                  scope="col"
                  data-col={slug}
                  className={cn("call-sheet-head p-0 align-bottom font-normal", isFocus && "call-sheet-band")}
                >
                  <button
                    type="button"
                    aria-pressed={pinned === slug}
                    onClick={() => setPinned((current) => (current === slug ? null : slug))}
                    className={cn(
                      "call-sheet-pin flex w-full flex-col items-center gap-2 pt-3 pb-3.5",
                      isDim(slug) && "is-dim",
                    )}
                  >
                    <ProjectLogo slug={slug} surface={surface} size="xs" className="call-sheet-dot" />
                    <span className="sr-only">{title}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        {groups.map(({ layer, label, rows: groupRows }) => (
          <tbody key={layer}>
            <tr>
              <th
                scope="rowgroup"
                colSpan={columns.length + 1}
                className="pt-6 pb-2.5 pl-2 font-mono text-[0.6875rem] font-normal tracking-[0.14em] text-ash uppercase lg:pt-4 lg:pb-2 lg:pl-3 lg:text-mono"
              >
                {label}
              </th>
            </tr>
            {groupRows.map(({ tool, cells, count }) => {
              const isShown = shownId === tool.id;
              return (
                <tr
                  key={tool.id}
                  data-tool={tool.id}
                  className={cn("call-sheet-row border-t border-hairline", isShown && "is-shown")}
                >
                  <th scope="row" className="p-0 font-normal">
                    <button
                      type="button"
                      data-tool-button={tool.id}
                      className="flex min-h-11 w-full scroll-mt-20 scroll-mb-36 items-center justify-between gap-1.5 py-1.5 pr-1.5 pl-2 text-left lg:gap-2 lg:pr-4 lg:pl-3 lg:pointer-fine:min-h-9"
                    >
                      <span className="call-sheet-tool text-[0.8125rem] leading-tight text-bone min-[380px]:text-[0.875rem] lg:text-body">
                        {tool.name}
                      </span>
                      <span aria-hidden className="shrink-0 font-mono text-[0.6875rem] text-ash tabular-nums lg:text-mono">
                        {count}/{columns.length}
                      </span>
                      <span className="sr-only">
                        , in {count} of {columns.length} projects
                      </span>
                    </button>
                  </th>
                  {columns.map(({ slug }, i) => (
                    <td
                      key={slug}
                      data-col={slug}
                      className={cn("p-0 text-center", focusCol === slug && "call-sheet-band")}
                    >
                      {cells[i] ? (
                        <>
                          <Check
                            aria-hidden
                            strokeWidth={2.25}
                            className={cn(
                              "call-sheet-dot call-sheet-tick inline size-3.5 align-middle lg:size-4",
                              focusCol === slug && "is-focus",
                              isDim(slug) && "is-dim",
                            )}
                          />
                          <span className="sr-only">Shipped</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="call-sheet-empty" />
                          <span className="sr-only">Not used</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}

        <tfoot>
          <tr className="border-t border-bone/25">
            <th
              scope="row"
              className="py-3.5 pl-2 font-mono text-[0.6875rem] font-normal tracking-[0.08em] text-ash uppercase lg:pl-3 lg:text-mono"
            >
              Total
            </th>
            {columns.map(({ slug, total }) => (
              <td
                key={slug}
                data-col={slug}
                className={cn(
                  "call-sheet-total p-0 text-center font-mono text-[0.75rem] tabular-nums lg:text-mono",
                  focusCol === slug && "call-sheet-band is-focus",
                  isDim(slug) && "is-dim",
                )}
              >
                {total}
              </td>
            ))}
          </tr>
          {kit.length > 0 && (
            <tr className="border-t border-hairline">
              <th
                scope="row"
                className="py-4 pr-2 pl-2 align-top font-mono text-[0.6875rem] font-normal tracking-[0.08em] text-ash uppercase lg:pl-3 lg:text-mono"
              >
                Everyday kit
              </th>
              <td colSpan={columns.length} className="py-3 pl-1">
                {/* Tools with a "why" line are buttons (a hairline pill, like a key); the rest are
                    plain labels, so nothing looks pressable that isn't. The spacing is padding on
                    each item (not a flex gap), so a pointer moving between pills never lands on
                    the list itself and blinks the line off and on. */}
                <ul className="-m-0.5 flex flex-wrap lg:-m-[3px]">
                  {kitShown.map((tool) => (
                    <li key={tool.id} data-tool={tool.why ? tool.id : undefined} className="p-0.5 lg:p-[3px]">
                      {tool.why ? (
                        <button
                          type="button"
                          data-tool-button={tool.id}
                          className={cn("call-sheet-kit", shownId === tool.id && "is-shown")}
                        >
                          {tool.name}
                        </button>
                      ) : (
                        <span className="call-sheet-kit is-plain">{tool.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {/* The "why" line, announced by a polite live region that is always in the DOM (it must exist
          before it changes); the visible card is a copy, hidden from screen readers. The slot below
          the table is a fixed box (and doubles as the section's bottom padding), so nothing on the
          page moves when a line appears. The card only renders while a line is showing: it floats
          16px above the bottom of the screen while the table runs past it and docks in the slot
          once the table's end is in view. */}
      <div id={WHY_ID} aria-live="polite" aria-atomic="true" className="sr-only">
        {shownTool && shownWhy ? `${shownTool.name}: ${shownWhy}` : ""}
      </div>
      <div aria-hidden className="call-sheet-why">
        {shownTool && shownWhy && (
          <p key={shownTool.id} className="call-sheet-why-card">
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-mono tracking-[0.08em] text-tungsten uppercase">{shownTool.name}</span>
              <span className="flex items-center gap-1">
                {shownRow
                  ? columns.map(({ slug, surface }, i) =>
                      shownRow.cells[i] ? (
                        <ProjectLogo
                          key={slug}
                          slug={slug}
                          surface={surface}
                          size="xs"
                          className="size-5 rounded-[4px] p-[1.5px] lg:size-5 lg:rounded-[4px] lg:p-[1.5px]"
                        />
                      ) : null,
                    )
                  : null}
              </span>
            </span>
            <span className="text-body leading-snug text-bone">{shownWhy}</span>
          </p>
        )}
      </div>
    </div>
  );
}
