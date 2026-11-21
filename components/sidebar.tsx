"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ACTIVITY_IDS,
  CATEGORY_BY_ID,
  cn,
  activityBrush,
  fmtHours,
  hoursByCategory,
  hoursBySubject,
  subjectBrush,
  subjectColor,
  type DwsState,
  type ActivityId,
  type Profile,
  type Signoff,
  type Subject,
  type ScheduleDetails,
} from "@/lib/dws";
import { Button, Field, inputClass } from "./ui";

interface SidebarProps {
  state: DwsState;
  brush: string;
  onBrush: (brush: string) => void;
  onProfile: (patch: Partial<Profile>) => void;
  onSignoff: (patch: Partial<Signoff>) => void;
  onAddSubject: () => string;
  onSplitSubject: (id: string) => string;
  onUpdateSubject: (id: string, patch: Partial<Subject>) => void;
  onRemoveSubject: (id: string) => void;
  onActivityHours: (id: ActivityId, hours: number) => void;
  onScheduleDetails: (patch: Partial<ScheduleDetails>) => void;
}

function Section({ step, title, hint, children, open = true }: { step: number; title: string; hint: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-gray-200">
      <summary className="flex list-none items-center gap-3 px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{title}</span>
          <span className="block truncate text-xs text-gray-500">{hint}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

function KindToggle({ value, onChange }: { value: Subject["kind"]; onChange: (kind: Subject["kind"]) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-md border border-gray-300 bg-white p-0.5 text-[13px]">
      {(["regular", "overload"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          aria-pressed={value === kind}
          onClick={() => onChange(kind)}
          className={cn(
            "h-8 rounded font-medium capitalize transition-colors",
            value === kind ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100",
          )}
        >
          {kind}
        </button>
      ))}
    </div>
  );
}

function ComponentToggle({ value, onChange }: { value: Subject["component"]; onChange: (component: Subject["component"]) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-md border border-gray-300 bg-white p-0.5 text-[13px]">
      {(["lec", "lab"] as const).map((component) => (
        <button
          key={component}
          type="button"
          aria-pressed={value === component}
          onClick={() => onChange(component)}
          className={cn(
            "h-8 rounded font-medium capitalize transition-colors",
            value === component ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100",
          )}
        >
          {component}
        </button>
      ))}
    </div>
  );
}

function SubjectRow({
  subject,
  placed,
  selected,
  editing,
  partNumber,
  effectivityDate,
  onSelect,
  onToggleEdit,
  onSplit,
  onUpdate,
  onRemove,
}: {
  subject: Subject;
  placed: number;
  selected: boolean;
  editing: boolean;
  partNumber?: number;
  effectivityDate: string;
  onSelect: () => void;
  onToggleEdit: () => void;
  onSplit: () => void;
  onUpdate: (patch: Partial<Subject>) => void;
  onRemove: () => void;
}) {
  const subjectPalette = subjectColor(subject);
  const complete = placed === subject.hours && subject.hours > 0;
  const over = placed > subject.hours;
  const percent = subject.hours > 0 ? Math.min(100, (placed / subject.hours) * 100) : 0;

  return (
    <li className="overflow-hidden rounded-lg border bg-white" style={selected ? { borderColor: subjectPalette.edge, boxShadow: `0 0 0 1px ${subjectPalette.edge}` } : { borderColor: "#E5E7EB" }}>
      <div className="flex items-stretch">
        <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: subjectPalette.edge }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900">
              {subject.code || "New subject"}
              {subject.section && <span className="font-normal text-gray-500"> · {subject.section}</span>}
            </span>
            <span className="block truncate text-[11px] text-gray-500">
              {partNumber ? `Part ${partNumber} · ` : ""}{[subject.component.toUpperCase(), subject.room].filter(Boolean).join(" · ")}
            </span>
            <span className={cn("block text-xs", over ? "text-amber-700" : complete ? "text-green-700" : "text-gray-500")}>
              {complete ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> {fmtHours(placed)} of {fmtHours(subject.hours)} h placed
                </span>
              ) : over ? (
                `${fmtHours(placed)} of ${fmtHours(subject.hours)} h (${fmtHours(placed - subject.hours)} over)`
              ) : (
                `${fmtHours(placed)} of ${fmtHours(subject.hours)} h placed`
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleEdit}
          aria-label={editing ? "Close editor" : "Edit subject"}
          className={cn("px-3 text-gray-400 hover:text-gray-800", editing && "text-gray-800")}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1 bg-gray-100">
        <div
          className="h-full transition-all"
          style={{ width: `${percent}%`, background: over ? "#D97706" : complete ? subjectPalette.edge : subjectPalette.edge }}
        />
      </div>

      {editing && (
        <div className="space-y-3 border-t border-gray-200 bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject code">
              <input
                className={inputClass}
                value={subject.code}
                placeholder="e.g. CPP118"
                autoFocus
                onChange={(e) => onUpdate({ code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Section">
              <input
                className={inputClass}
                value={subject.section}
                placeholder="e.g. 4CPEB"
                onChange={(e) => onUpdate({ section: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours per week">
              <input
                className={inputClass}
                type="number"
                min={0.5}
                step={0.5}
                value={subject.hours}
                onChange={(e) => onUpdate({ hours: Math.max(0, Number(e.target.value) || 0) })}
              />
            </Field>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-600">Load type</span>
              <KindToggle value={subject.kind} onChange={(kind) => onUpdate({ kind })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Descriptive title">
              <input
                className={inputClass}
                value={subject.title}
                placeholder="e.g. Emerging Technologies"
                onChange={(e) => onUpdate({ title: e.target.value })}
              />
            </Field>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-600">Type</span>
              <ComponentToggle value={subject.component} onChange={(component) => onUpdate({ component })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Room">
              <input
                className={inputClass}
                value={subject.room}
                placeholder="e.g. 302"
                onChange={(e) => onUpdate({ room: e.target.value })}
              />
            </Field>
            <Field label="Effectivity date">
              <input
                className={inputClass}
                type="date"
                value={subject.startDate || effectivityDate}
                onChange={(e) => onUpdate({ startDate: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5">
            <p className="text-xs font-medium text-blue-900">Different rooms or lecture/lab components?</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full border-blue-200 bg-white text-blue-800 hover:bg-blue-50"
              disabled={subject.hours < 1}
              onClick={onSplit}
            >
              <CopyPlus className="h-3.5 w-3.5" /> Split into two parts
            </Button>
            <p className="mt-1.5 text-[11px] leading-4 text-blue-700">
              Copies this subject and divides its hours equally. Current grid placements stay with the original part.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" /> Delete subject
            </button>
            <Button size="sm" variant="secondary" onClick={onToggleEdit}>Done</Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Sidebar({ state, brush, onBrush, onProfile, onSignoff, onAddSubject, onSplitSubject, onUpdateSubject, onRemoveSubject, onActivityHours, onScheduleDetails }: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { profile, signoff, subjects, cells } = state;
  const placed = hoursBySubject(cells);
  const byCategory = hoursByCategory(cells, subjects);
  const load = subjects.reduce((sum, s) => sum + s.hours, 0);
  const placedTotal = subjects.reduce((sum, s) => sum + (placed[s.id] ?? 0), 0);
  const groups = subjects.reduce<Map<string, Subject[]>>((result, subject) => {
    const key = subject.groupId || subject.id;
    result.set(key, [...(result.get(key) ?? []), subject]);
    return result;
  }, new Map());

  return (
    <div>
      <Section step={1} title="Your details" hint="Appears at the top of the form">
        <div className="space-y-3">
          <Field label="Full name">
            <input className={inputClass} value={profile.name} placeholder="e.g. JUAN D. DELA CRUZ" onChange={(e) => onProfile({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position title">
              <input className={inputClass} value={profile.position} placeholder="e.g. Instructor 1" onChange={(e) => onProfile({ position: e.target.value })} />
            </Field>
            <Field label="Designation">
              <input className={inputClass} value={profile.designation} placeholder="N/A" onChange={(e) => onProfile({ designation: e.target.value })} />
            </Field>
          </div>
          <Field label="Department / Office">
            <input className={inputClass} value={profile.department} placeholder="e.g. COLLEGE OF ENGINEERING" onChange={(e) => onProfile({ department: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Semester">
              <select className={inputClass} value={profile.semester} onChange={(e) => onProfile({ semester: e.target.value })}>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </Field>
            <Field label="Academic year">
              <input className={inputClass} value={profile.academicYear} placeholder="2026-2027" onChange={(e) => onProfile({ academicYear: e.target.value })} />
            </Field>
          </div>
          <Field label="Effectivity date">
            <input className={inputClass} type="date" value={profile.effectivityDate} onChange={(e) => onProfile({ effectivityDate: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section step={2} title="Subjects" hint="Pick one, then fill the grid">
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs font-semibold text-slate-800">Show inside scheduled blocks</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Choose the subject details users see in the DWS.</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {([
              ["code", "Course code"],
              ["section", "Section"],
              ["component", "LEC / LAB"],
              ["room", "Room"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={state.scheduleDetails[key]}
                  onChange={(event) => onScheduleDetails({ [key]: event.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-blue-600"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        {subjects.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-[13px] text-gray-500">
            Add each subject and section you teach, with its hours per week.
          </p>
        ) : (
          <ul className="mb-3 space-y-3">
            {[...groups.values()].map((members) => {
              const split = members.length > 1;
              const leader = members[0];
              const assigned = members.reduce((sum, member) => sum + member.hours, 0);
              const completed = members.reduce((sum, member) => sum + (placed[member.id] ?? 0), 0);
              const palette = subjectColor(leader);
              return (
                <li
                  key={leader.groupId || leader.id}
                  className={cn("rounded-xl", split && "border p-2.5")}
                  style={split ? {
                    borderColor: `${palette.edge}45`,
                    background: palette.soft,
                  } : undefined}
                >
                  {split && (
                    <div className="mb-2 px-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold uppercase tracking-wide" style={{ color: palette.ink }}>
                          {leader.code || "Subject"}{leader.section ? ` · ${leader.section}` : ""}
                        </p>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: palette.ink, background: `${palette.edge}18` }}>
                          {members.length} parts
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px]" style={{ color: palette.ink }}>
                        One subject · {fmtHours(completed)} of {fmtHours(assigned)} h placed
                      </p>
                    </div>
                  )}
                  <ul className={cn(split && "space-y-2")}>
                    {members.map((subject, index) => (
                      <SubjectRow
                        key={subject.id}
                        subject={subject}
                        partNumber={split ? index + 1 : undefined}
                        placed={placed[subject.id] ?? 0}
                        selected={brush === subjectBrush(subject.id)}
                        editing={editingId === subject.id}
                        effectivityDate={profile.effectivityDate}
                        onSelect={() => onBrush(subjectBrush(subject.id))}
                        onToggleEdit={() => setEditingId(editingId === subject.id ? null : subject.id)}
                        onSplit={() => {
                          const id = onSplitSubject(subject.id);
                          setEditingId(id);
                        }}
                        onUpdate={(patch) => onUpdateSubject(subject.id, patch)}
                        onRemove={() => {
                          onRemoveSubject(subject.id);
                          setEditingId(null);
                        }}
                      />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          className="w-full"
          onClick={() => {
            const id = onAddSubject();
            setEditingId(id);
          }}
        >
          <Plus className="h-4 w-4" /> Add subject
        </Button>
        {subjects.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            Teaching load {fmtHours(load)} h · placed {fmtHours(placedTotal)} h
          </p>
        )}
      </Section>

      <Section step={3} title="Other activities" hint="Research, consultation, breaks and more">
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_IDS.map((id) => {
            const meta = CATEGORY_BY_ID[id];
            const selected = brush === activityBrush(id);
            const target = state.activityHours[id];
            const current = byCategory[id];
            return (
              <div
                key={id}
                className={cn(
                  "rounded-lg border bg-white p-2.5 transition-colors",
                  selected ? "border-blue-600 ring-1 ring-blue-600" : "border-gray-200",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onBrush(activityBrush(id))}
                  className="flex w-full items-center gap-2.5 text-left"
                >
                  <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: meta.edge }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-gray-900">{meta.name}</span>
                    <span className={cn("block text-xs", target > 0 && current >= target ? "text-green-700" : "text-gray-500")}>
                      {fmtHours(current)} / {fmtHours(target)} h
                    </span>
                  </span>
                </button>
                <label className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span>Target</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    value={target}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onActivityHours(id, Math.max(0, Number(event.target.value) || 0))}
                    className="h-7 min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
                    aria-label={`${meta.name} weekly target hours`}
                  />
                  <span>h</span>
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      <Section step={4} title="Sign-off" hint="Endorser and approver on the form" open={false}>
        <div className="space-y-3">
          <Field label="Endorsed by">
            <input className={inputClass} value={signoff.endorserName} placeholder="Name" onChange={(e) => onSignoff({ endorserName: e.target.value })} />
          </Field>
          <Field label="Endorser title">
            <input className={inputClass} value={signoff.endorserTitle} placeholder="e.g. Program Chair-CPE" onChange={(e) => onSignoff({ endorserTitle: e.target.value })} />
          </Field>
          <Field label="Approved by">
            <input className={inputClass} value={signoff.approverName} placeholder="Name" onChange={(e) => onSignoff({ approverName: e.target.value })} />
          </Field>
          <Field label="Approver title">
            <input className={inputClass} value={signoff.approverTitle} placeholder="e.g. Dean / VPASS" onChange={(e) => onSignoff({ approverTitle: e.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}
