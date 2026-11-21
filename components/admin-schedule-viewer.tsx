"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Loader2 } from "lucide-react";
import { AssignmentSheet, SHEET_WIDTH } from "./assignment-sheet";
import { FormSheet, PAGE_WIDTH } from "./form-sheet";
import { cn, sanitizeState, type DwsState } from "@/lib/dws";
import { buildAssignment } from "@/lib/assignment";

type DocumentView = "dws" | "regular" | "overload";

export function AdminScheduleViewer({ userId }: { userId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DwsState | null>(null);
  const [email, setEmail] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [view, setView] = useState<DocumentView>("dws");
  const [scale, setScale] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/schedules/${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { email?: string; updatedAt?: string; state?: unknown; error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load this schedule.");
        const clean = sanitizeState(body.state);
        if (!clean) throw new Error("The saved schedule is invalid.");
        setState(clean);
        setEmail(body.email || "");
        setUpdatedAt(body.updatedAt || "");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load this schedule."));
  }, [userId]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = view === "dws" ? PAGE_WIDTH : SHEET_WIDTH;
      setScale(Math.min(1, (entry.contentRect.width - 48) / width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [view, state]);

  const width = view === "dws" ? PAGE_WIDTH : SHEET_WIDTH;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{email || "User schedule"}</p>
              <p className="text-xs text-slate-500">
                {updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "Loading saved documents…"}
              </p>
            </div>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {([
              ["dws", "DWS", CalendarDays],
              ["regular", "Regular TL", FileText],
              ["overload", "Overload TL", FileText],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                  view === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-white hover:text-slate-900",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div ref={container} className="mx-auto h-[calc(100vh-3.75rem)] max-w-7xl overflow-y-auto px-6 py-6">
        {error && <p role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {!error && !state && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading saved documents…
          </div>
        )}
        {state && (
          <div className="mx-auto shadow-lg ring-1 ring-slate-300" style={{ width: width * scale, height: 1248 * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {view === "dws" ? (
                <FormSheet state={state} />
              ) : (
                <AssignmentSheet state={state} kind={view} model={buildAssignment(state, view)} />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
