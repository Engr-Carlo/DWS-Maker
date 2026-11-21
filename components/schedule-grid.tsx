"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import {
  CATEGORY_BY_ID,
  DAYS,
  DAY_NAMES,
  ERASER,
  SLOT_COUNT,
  buildGrid,
  cellKey,
  cn,
  formatClock,
  resolveBrush,
  slotStart,
  type Cells,
  type CellView,
  type Subject,
} from "@/lib/dws";

interface ScheduleGridProps {
  cells: Cells;
  subjects: Subject[];
  brush: string;
  onStrokeStart: () => void;
  onPaint: (keys: string[], brush: string, erase: boolean) => void;
  onStrokeEnd: () => void;
}

interface Stroke {
  brush: string;
  erase: boolean;
  lastDay: number;
  lastSlot: number;
}

const COLUMNS = "64px repeat(6, minmax(0, 1fr))";

function locate(x: number, y: number): { day: number; slot: number } | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-day]");
  if (!el) return null;
  return { day: Number(el.dataset.day), slot: Number(el.dataset.slot) };
}

const ROW_HEIGHT = 28;

function Block({ view }: { view: CellView }) {
  const meta = CATEGORY_BY_ID[view.res.category];
  const { title, subtitle } = view.res;
  return (
    <div
      className="pointer-events-none absolute z-[1] overflow-hidden rounded-md px-2"
      style={{
        left: 2,
        right: 2,
        top: 1,
        height: view.length * ROW_HEIGHT - 3,
        background: meta.soft,
        color: meta.ink,
        boxShadow: `inset 3px 0 0 ${meta.edge}`,
      }}
    >
      <div className="pt-[5px] pl-1 leading-tight">
        <div className="truncate text-xs font-semibold">
          {view.length === 1 ? [title, subtitle].filter(Boolean).join(" ") : title}
        </div>
        {view.length > 1 && subtitle && <div className="truncate text-[11px] opacity-80">{subtitle}</div>}
      </div>
    </div>
  );
}

export function ScheduleGrid({ cells, subjects, brush, onStrokeStart, onPaint, onStrokeEnd }: ScheduleGridProps) {
  const grid = useMemo(() => buildGrid(cells, subjects), [cells, subjects]);
  const stroke = useRef<Stroke | null>(null);

  useEffect(() => {
    const end = () => {
      if (!stroke.current) return;
      stroke.current = null;
      onStrokeEnd();
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [onStrokeEnd]);

  const paintAt = (day: number, slot: number) => {
    const s = stroke.current;
    if (!s) return;
    const keys: string[] = [];
    if (s.lastDay === day && s.lastSlot !== slot) {
      const from = Math.min(s.lastSlot, slot);
      const to = Math.max(s.lastSlot, slot);
      for (let i = from; i <= to; i++) keys.push(cellKey(day, i));
    } else {
      keys.push(cellKey(day, slot));
    }
    s.lastDay = day;
    s.lastSlot = slot;
    onPaint(keys, s.brush, s.erase);
  };

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const at = locate(e.clientX, e.clientY);
    if (!at) return;
    e.preventDefault();
    const erase = brush === ERASER || cells[cellKey(at.day, at.slot)] === brush;
    stroke.current = { brush, erase, lastDay: -1, lastSlot: -1 };
    onStrokeStart();
    paintAt(at.day, at.slot);
  };

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!stroke.current) return;
    const at = locate(e.clientX, e.clientY);
    if (at) paintAt(at.day, at.slot);
  };

  const tint = brush === ERASER ? "#F3F4F6" : CATEGORY_BY_ID[resolveBrush(brush, subjects)?.category ?? "regular"].soft;

  return (
    <div className="overflow-clip rounded-lg border border-gray-200 bg-white">
      <div>
        <div
          className="sticky top-14 z-10 grid border-b border-gray-200 bg-white"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <div className="px-2 py-2.5 text-right text-[11px] font-medium text-gray-400">Time</div>
          {DAYS.map((day, i) => (
            <div key={day} className="border-l border-gray-200 py-2.5 text-center text-[13px] font-medium text-gray-700">
              <span className="hidden xl:inline">{DAY_NAMES[i]}</span>
              <span className="xl:hidden">{day.charAt(0) + day.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>

        <div
          className="grid touch-none select-none"
          style={{ gridTemplateColumns: COLUMNS, "--brush-tint": tint } as CSSProperties}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
        >
          {Array.from({ length: SLOT_COUNT }, (_, slot) => {
            const onHour = slot % 2 === 0;
            const border = onHour ? "border-t-gray-200" : "border-t-gray-100";
            return (
              <div key={slot} className="contents">
                <div className={cn("h-7 border-t pr-2 pt-1 text-right text-[11px] leading-none text-gray-500", border)}>
                  {onHour ? formatClock(slotStart(slot)) : ""}
                </div>
                {DAYS.map((day, d) => {
                  const view = grid[slot][d];
                  return (
                    <div
                      key={day}
                      data-day={d}
                      data-slot={slot}
                      className={cn("relative h-7 border-l border-t border-l-gray-200", border, !view && "slot-empty")}
                    >
                      {view?.start && <Block view={view} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
