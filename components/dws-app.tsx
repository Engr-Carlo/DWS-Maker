"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import { saveAs } from "file-saver";
import {
  Download,
  Eraser,
  FileDown,
  FolderOpen,
  LayoutTemplate,
  MoreHorizontal,
  Printer,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  ERASER,
  activityBrush,
  applyPaint,
  cn,
  defaultState,
  exampleState,
  fileBaseName,
  fmtHours,
  hoursByCategory,
  isBlank,
  loadState,
  newSubject,
  resolveBrush,
  sanitizeState,
  saveState,
  subjectBrush,
  totalHours,
  type Cells,
  type CategoryId,
  type DwsState,
  type Profile,
  type Signoff,
  type Subject,
} from "@/lib/dws";
import { exportDocx } from "@/lib/docx-export";
import { FormSheet, PreviewPane } from "./form-sheet";
import { ScheduleGrid } from "./schedule-grid";
import { Sidebar } from "./sidebar";
import { Button } from "./ui";

const SHORT_NAMES: Record<CategoryId, string> = {
  regular: "Regular",
  overload: "Overload",
  research: "Research",
  extension: "Com. Ext.",
  consultation: "Consultation",
  quasi: "Quasi",
  admin: "Admin",
  break: "Break",
};

const subscribe = () => () => {};

export default function DwsApp() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? <Workspace /> : <div className="min-h-screen bg-white" />;
}

function defaultBrush(state: DwsState): string {
  return state.subjects[0] ? subjectBrush(state.subjects[0].id) : activityBrush("research");
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

function FileMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Button variant="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <MoreHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">File</span>
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <div key={item.label}>
              {item.divider && <div className="my-1 border-t border-gray-100" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50",
                  item.danger ? "text-red-600" : "text-gray-800",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Workspace() {
  const [state, setState] = useState<DwsState>(loadState);
  const [brush, setBrush] = useState(() => defaultBrush(state));
  const [previousBrush, setPreviousBrush] = useState(brush);
  const [view, setView] = useState<"schedule" | "preview">("schedule");
  const [past, setPast] = useState<Cells[]>([]);
  const [future, setFuture] = useState<Cells[]>([]);
  const [exporting, setExporting] = useState(false);

  const stateRef = useRef(state);
  const snapshot = useRef<Cells | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  const { cells, subjects } = state;
  const byCategory = hoursByCategory(cells, subjects);
  const total = totalHours(byCategory, state.includeBreak);
  const showGuide = subjects.length === 0 && Object.keys(cells).length === 0;

  const resetHistory = () => {
    setPast([]);
    setFuture([]);
  };

  const replaceState = (next: DwsState) => {
    setState(next);
    const nextBrush = defaultBrush(next);
    setBrush(nextBrush);
    setPreviousBrush(nextBrush);
    resetHistory();
  };

  const undo = () => {
    if (past.length === 0) return;
    setFuture([cells, ...future]);
    setState({ ...state, cells: past[past.length - 1] });
    setPast(past.slice(0, -1));
  };

  const redo = () => {
    if (future.length === 0) return;
    setPast([...past, cells]);
    setState({ ...state, cells: future[0] });
    setFuture(future.slice(1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).closest("input, textarea, select")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleStrokeStart = () => {
    snapshot.current = stateRef.current.cells;
  };

  const handleStrokeEnd = () => {
    const before = snapshot.current;
    snapshot.current = null;
    if (before && before !== stateRef.current.cells) {
      setPast((p) => [...p.slice(-49), before]);
      setFuture([]);
    }
  };

  const handlePaint = (keys: string[], paintBrush: string, erase: boolean) => {
    setState((s) => {
      if (!erase && !resolveBrush(paintBrush, s.subjects)) return s;
      const next = applyPaint(s.cells, keys, paintBrush, erase);
      return next === s.cells ? s : { ...s, cells: next };
    });
  };

  const addSubject = (): string => {
    const subject = newSubject();
    setState((s) => ({ ...s, subjects: [...s.subjects, subject] }));
    setBrush(subjectBrush(subject.id));
    return subject.id;
  };

  const updateSubject = (id: string, patch: Partial<Subject>) =>
    setState((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const removeSubject = (id: string) => {
    const removed = subjectBrush(id);
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      cells: Object.fromEntries(Object.entries(s.cells).filter(([, b]) => b !== removed)),
    }));
    if (brush === removed) setBrush(activityBrush("research"));
    if (previousBrush === removed) setPreviousBrush(activityBrush("research"));
  };

  const toggleEraser = () => {
    if (brush === ERASER) {
      setBrush(previousBrush);
    } else {
      setPreviousBrush(brush);
      setBrush(ERASER);
    }
  };

  const selectBrush = (next: string) => {
    setBrush(next);
    setView("schedule");
  };

  const loadExample = () => {
    if (!isBlank(state) && !window.confirm("Replace your current schedule with the example?")) return;
    replaceState(exampleState());
  };

  const startOver = () => {
    if (!window.confirm("Clear everything and start a new, blank schedule?")) return;
    replaceState(defaultState());
  };

  const clearSchedule = () => {
    if (Object.keys(cells).length === 0) return;
    setPast([...past.slice(-49), cells]);
    setFuture([]);
    setState({ ...state, cells: {} });
  };

  const saveBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    saveAs(blob, `${fileBaseName(state)}.dws.json`);
  };

  const openBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const restored = sanitizeState(JSON.parse(await file.text()));
      if (!restored) throw new Error("invalid");
      replaceState(restored);
    } catch {
      window.alert("That file is not a DWS Maker backup.");
    }
  };

  const download = async () => {
    setExporting(true);
    try {
      await exportDocx(state);
    } catch {
      window.alert("Sorry, the Word file could not be created. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const brushInfo = (() => {
    if (brush === ERASER) return { label: "Eraser", color: "#9CA3AF" };
    const res = resolveBrush(brush, subjects);
    if (!res) return { label: "Nothing selected", color: "#D1D5DB" };
    const label = res.subtitle ? `${res.title} · ${res.subtitle}` : res.title;
    return { label: brush.startsWith("activity:") ? CATEGORY_BY_ID[res.category].name : label, color: CATEGORY_BY_ID[res.category].edge };
  })();

  return (
    <>
      <div className="min-h-screen bg-white print:hidden">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/form/seal.png" alt="" width={152} height={193} unoptimized className="h-7 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">DWS Maker</div>
              <div className="hidden text-xs text-gray-500 md:block">Declaration of Work Schedule</div>
            </div>
          </div>

          <nav className="mx-auto flex rounded-lg bg-gray-100 p-0.5 text-sm" aria-label="View">
            {(
              [
                ["schedule", "Schedule"],
                ["preview", "Form preview"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={view === id ? "page" : undefined}
                onClick={() => setView(id)}
                className={cn(
                  "h-8 rounded-md px-3 font-medium transition-colors",
                  view === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <FileMenu
              items={[
                { label: "Load example", icon: <LayoutTemplate className="h-4 w-4" />, onClick: loadExample },
                { label: "Save backup file", icon: <FileDown className="h-4 w-4" />, onClick: saveBackup, divider: true },
                { label: "Open backup file…", icon: <FolderOpen className="h-4 w-4" />, onClick: () => fileInput.current?.click() },
                { label: "Clear schedule grid", icon: <Eraser className="h-4 w-4" />, onClick: clearSchedule, divider: true },
                { label: "Start over", icon: <Trash2 className="h-4 w-4" />, onClick: startOver, danger: true },
              ]}
            />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="primary" onClick={download} disabled={exporting}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{exporting ? "Preparing…" : "Download .docx"}</span>
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={openBackup} />
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[340px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <Sidebar
              state={state}
              brush={brush}
              onBrush={selectBrush}
              onProfile={(patch: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))}
              onSignoff={(patch: Partial<Signoff>) => setState((s) => ({ ...s, signoff: { ...s.signoff, ...patch } }))}
              onAddSubject={addSubject}
              onUpdateSubject={updateSubject}
              onRemoveSubject={removeSubject}
            />
          </aside>

          <main className="min-w-0 flex-1">
            {view === "preview" ? (
              <PreviewPane state={state} />
            ) : (
              <div className="mx-auto max-w-[1100px] space-y-4 p-4 sm:p-6">
                {showGuide && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-950">How it works</p>
                      <p className="mt-0.5 text-[13px] text-blue-900">
                        Fill in your details, add your subjects, pick one and click or drag across the grid. Then download the Word file.
                      </p>
                    </div>
                    <Button onClick={loadExample}>See an example</Button>
                  </div>
                )}

                <div className="flex flex-col gap-3 lg:flex-row">
                  <dl className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-4 xl:grid-cols-8">
                    {CATEGORIES.map((c) => (
                      <div key={c.id} className="bg-white px-3 py-2.5">
                        <dt className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.edge }} />
                          <span className="truncate">{SHORT_NAMES[c.id]}</span>
                        </dt>
                        <dd className={cn("mt-0.5 text-lg font-semibold tabular-nums", byCategory[c.id] === 0 && "text-gray-300")}>
                          {fmtHours(byCategory[c.id])}
                          <span className="ml-0.5 text-xs font-normal text-gray-400">h</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="rounded-lg bg-gray-900 px-4 py-2.5 text-white lg:w-40">
                    <div className="text-[11px] text-gray-300">Total on form</div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {fmtHours(total)}
                      <span className="ml-1 text-sm font-normal text-gray-400">h</span>
                    </div>
                    <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={state.includeBreak}
                        onChange={(e) => setState({ ...state, includeBreak: e.target.checked })}
                        className="h-3 w-3 accent-blue-500"
                      />
                      Count breaks
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Placing</span>
                    <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-900">
                      <span className="h-3 w-1 rounded-full" style={{ background: brushInfo.color }} />
                      {brushInfo.label}
                    </span>
                  </div>
                  <p className="hidden text-xs text-gray-500 md:block">Click or drag across the grid. Click a placed slot again to clear it.</p>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button size="sm" variant={brush === ERASER ? "primary" : "secondary"} aria-pressed={brush === ERASER} onClick={toggleEraser}>
                      <Eraser className="h-4 w-4" /> Eraser
                    </Button>
                    <Button size="sm" variant="secondary" onClick={undo} disabled={past.length === 0} aria-label="Undo">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={redo} disabled={future.length === 0} aria-label="Redo">
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScheduleGrid
                  cells={cells}
                  subjects={subjects}
                  brush={brush}
                  onStrokeStart={handleStrokeStart}
                  onPaint={handlePaint}
                  onStrokeEnd={handleStrokeEnd}
                />

                <p className="pb-2 text-xs text-gray-400">Saved automatically in this browser. Press Ctrl+Z to undo your last placement.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <div className="hidden print:block">
        <FormSheet state={state} />
      </div>
    </>
  );
}
