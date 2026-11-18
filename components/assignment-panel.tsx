"use client";

import { useMemo, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Button, Field, inputClass } from "./ui";
import { buildAssignment, formatNumber } from "@/lib/assignment";
import { cn, type Assignment, type DwsState, type Subject, type SubjectKind } from "@/lib/dws";

const REGULAR_TARGET_HOURS = 24;

interface PanelProps {
  state: DwsState;
  onSubject: (id: string, patch: Partial<Subject>) => void;
  onAssignment: (patch: Partial<Assignment>) => void;
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div className="grid rounded-md border border-gray-300 bg-white p-0.5 text-[13px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-8 rounded font-medium transition-colors", value === o.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function LoadCard({ state, kind, busy, onDownload }: { state: DwsState; kind: SubjectKind; busy: boolean; onDownload: (kinds: SubjectKind[]) => void }) {
  const model = useMemo(() => buildAssignment(state, kind), [state, kind]);
  const total = state.subjects.filter((s) => s.kind === kind).length;
  const regular = kind === "regular";
  const off = regular && model.rows.length > 0 && model.totalHours !== REGULAR_TARGET_HOURS;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full" style={{ background: regular ? "#3B8F45" : "#DC2626" }} />
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-gray-900">{regular ? "Regular load" : "Overload"}</h3>
            <p className="text-sm text-gray-500">{regular ? "First letter — your 24-hour teaching load" : "Second letter — everything beyond the regular load"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Hours", formatNumber(model.totalHours)],
            ["Units", formatNumber(model.totalUnits)],
            ["Classes", String(model.rows.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-gray-50 px-3 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 min-h-[3rem] space-y-1 text-sm">
          {total === 0 && <p className="text-gray-500">No {regular ? "regular" : "overload"} subjects yet. Add them in step 2 on the left and set the load type.</p>}
          {model.unplaced.length > 0 && (
            <p className="flex items-start gap-1.5 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {model.unplaced.length === 1 ? "1 subject is" : `${model.unplaced.length} subjects are`} not on the schedule grid yet, so
              {model.unplaced.length === 1 ? " it is" : " they are"} left out.
            </p>
          )}
          {off && (
            <p className="flex items-start gap-1.5 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              A regular load is {REGULAR_TARGET_HOURS} hours; this one is {formatNumber(model.totalHours)}. Move a subject to Overload if needed.
            </p>
          )}
          {regular && model.rows.length > 0 && !off && model.unplaced.length === 0 && (
            <p className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Matches the {REGULAR_TARGET_HOURS}-hour regular load.
            </p>
          )}
        </div>

        <Button className="mt-auto w-full" variant="primary" disabled={busy || model.rows.length === 0} onClick={() => onDownload([kind])}>
          <Download className="h-4 w-4" /> Download {regular ? "regular load" : "overload"} (.docx)
        </Button>
      </div>
    </div>
  );
}

export function AssignmentPanel({ state, onSubject, onAssignment }: PanelProps) {
  const a = state.assignment;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 p-4 sm:p-6">
      <div className="space-y-6">
        <div className="space-y-6">
          <Card title="Class details" hint="Days and times come from your schedule grid.">
            {state.subjects.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-[13px] text-gray-500">
                Add your subjects in step 2 on the left first.
              </p>
            ) : (
              <ul className="space-y-3">
                {state.subjects.map((s) => (
                  <li key={s.id} className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {s.code || "New subject"}
                              {s.section && <span className="font-normal text-gray-500"> · {s.section}</span>}
                            </div>
                          </div>
                          <div className="w-full max-w-[220px] shrink-0 xl:w-52">
                            <Segmented
                              value={s.kind}
                              options={[
                                { id: "regular", label: "Regular" },
                                { id: "overload", label: "Overload" },
                              ]}
                              onChange={(kindValue) => onSubject(s.id, { kind: kindValue })}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <Field label="Descriptive title">
                            <input className={inputClass} value={s.title} placeholder="e.g. Emerging Technologies" onChange={(e) => onSubject(s.id, { title: e.target.value })} />
                          </Field>
                          <div>
                            <span className="mb-1 block text-xs font-medium text-gray-600">Type</span>
                            <Segmented
                              value={s.component}
                              options={[
                                { id: "lec", label: "Lec" },
                                { id: "lab", label: "Lab" },
                              ]}
                              onChange={(component) => onSubject(s.id, { component })}
                            />
                          </div>
                          <Field label="Room">
                            <input className={inputClass} value={s.room} placeholder="e.g. 302" onChange={(e) => onSubject(s.id, { room: e.target.value })} />
                          </Field>
                          <Field label="Effectivity date">
                            <input className={inputClass} type="date" value={s.startDate || state.profile.effectivityDate} onChange={(e) => onSubject(s.id, { startDate: e.target.value })} />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-500">Lecture units equal hours; a lab unit equals 3 hours. Classes that meet at the same time on several days share one row.</p>
          </Card>

          <Card title="Memo details" hint="Appears at the top and bottom of each letter.">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of memo">
                  <input className={inputClass} type="date" value={a.date} onChange={(e) => onAssignment({ date: e.target.value })} />
                </Field>
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
                  <Segmented
                    value={a.final ? "final" : "tentative"}
                    options={[
                      { id: "tentative", label: "Tentative" },
                      { id: "final", label: "Final" },
                    ]}
                    onChange={(v) => onAssignment({ final: v === "final" })}
                  />
                </div>
              </div>
              <Field label="To (name as “Last, First M.”)">
                <input className={inputClass} value={a.toName} placeholder={state.profile.name || "Dela Cruz, Juan D."} onChange={(e) => onAssignment({ toName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From (Dean)">
                  <input className={inputClass} value={a.fromName} placeholder="DR. JUAN SANTOS" onChange={(e) => onAssignment({ fromName: e.target.value })} />
                </Field>
                <Field label="Dean’s title">
                  <input className={inputClass} value={a.fromTitle} placeholder="Dean, College of Engineering" onChange={(e) => onAssignment({ fromTitle: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="VP for Academic Affairs">
                  <input className={inputClass} value={a.vpName} placeholder="Dr. Maria Reyes" onChange={(e) => onAssignment({ vpName: e.target.value })} />
                </Field>
                <Field label="VP’s title">
                  <input className={inputClass} value={a.vpTitle} onChange={(e) => onAssignment({ vpTitle: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <Field label="Conforme (your name)">
                  <input className={inputClass} value={a.conformeName} placeholder={state.profile.name || "Engr. Juan D. Dela Cruz"} onChange={(e) => onAssignment({ conformeName: e.target.value })} />
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={a.employment} onChange={(e) => onAssignment({ employment: e.target.value })}>
                    <option value="FT">FT</option>
                    <option value="PT">PT</option>
                  </select>
                </Field>
              </div>
              <Field label="Consultation room">
                <input className={inputClass} value={a.consultRoom} placeholder="e.g. COE Office" onChange={(e) => onAssignment({ consultRoom: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Faculty profile" hint="Highest degrees earned. Leave blank if not applicable.">
            <div className="space-y-3">
              <Field label="Bachelor">
                <input className={inputClass} value={a.bachelor} placeholder="e.g. BS IN COMPUTER ENGINEERING" onChange={(e) => onAssignment({ bachelor: e.target.value })} />
              </Field>
              <Field label="Masteral">
                <input className={inputClass} value={a.masteral} onChange={(e) => onAssignment({ masteral: e.target.value })} />
              </Field>
              <Field label="Doctorate">
                <input className={inputClass} value={a.doctorate} onChange={(e) => onAssignment({ doctorate: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

export function AssignmentPreviewPanel({ state, busy, onDownload }: { state: DwsState; busy: boolean; onDownload: (kinds: SubjectKind[]) => void }) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-4xl font-bold tracking-tight text-gray-900">Teachload preview</h2>
        <p className="mt-1 max-w-3xl text-base text-gray-600">
          Review the regular and overload teaching assignment letters. Update the class details on the left, then use the download actions at the bottom of each preview card.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <LoadCard state={state} kind="regular" busy={busy} onDownload={onDownload} />
        <LoadCard state={state} kind="overload" busy={busy} onDownload={onDownload} />
      </div>
    </div>
  );
}
