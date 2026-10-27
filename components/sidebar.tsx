"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ACTIVITY_IDS,
  CATEGORY_BY_ID,
  cn,
  activityBrush,
  fmtHours,
  hoursByCategory,
  hoursBySubject,
  subjectBrush,
  type DwsState,
  type Profile,
  type Signoff,
  type Subject,
} from "@/lib/dws";
import { Button, Field, inputClass } from "./ui";

interface SidebarProps {
  state: DwsState;
  brush: string;
  onBrush: (brush: string) => void;
  onProfile: (patch: Partial<Profile>) => void;
  onSignoff: (patch: Partial<Signoff>) => void;
  onAddSubject: () => string;
  onUpdateSubject: (id: string, patch: Partial<Subject>) => void;
  onRemoveSubject: (id: string) => void;
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

function SubjectRow({
  subject,
  placed,
  selected,
  editing,
  onSelect,
  onToggleEdit,
  onUpdate,
  onRemove,
}: {
  subject: Subject;
  placed: number;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<Subject>) => void;
  onRemove: () => void;
}) {
  const meta = CATEGORY_BY_ID[subject.kind];
  const complete = placed === subject.hours && subject.hours > 0;
  const over = placed > subject.hours;
  const percent = subject.hours > 0 ? Math.min(100, (placed / subject.hours) * 100) : 0;

  return (
    <li className={cn("overflow-hidden rounded-lg border bg-white", selected ? "border-blue-600 ring-1 ring-blue-600" : "border-gray-200")}>
      <div className="flex items-stretch">
        <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: meta.edge }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900">
              {subject.code || "New subject"}
              {subject.section && <span className="font-normal text-gray-500"> · {subject.section}</span>}
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
          style={{ width: `${percent}%`, background: over ? "#D97706" : complete ? "#16A34A" : "#2563EB" }}
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
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" /> Delete subject
            </button>
            <Button size="sm" variant="secondary" onClick={onToggleEdit}>
              Done
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Sidebar({ state, brush, onBrush, onProfile, onSignoff, onAddSubject, onUpdateSubject, onRemoveSubject }: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { profile, signoff, subjects, cells } = state;
  const placed = hoursBySubject(cells);
  const byCategory = hoursByCategory(cells, subjects);
  const load = subjects.reduce((sum, s) => sum + s.hours, 0);
  const placedTotal = subjects.reduce((sum, s) => sum + (placed[s.id] ?? 0), 0);

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
        {subjects.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-[13px] text-gray-500">
            Add each subject and section you teach, with its hours per week.
          </p>
        ) : (
          <ul className="mb-3 space-y-2">
            {subjects.map((subject) => (
              <SubjectRow
                key={subject.id}
                subject={subject}
                placed={placed[subject.id] ?? 0}
                selected={brush === subjectBrush(subject.id)}
                editing={editingId === subject.id}
                onSelect={() => onBrush(subjectBrush(subject.id))}
                onToggleEdit={() => setEditingId(editingId === subject.id ? null : subject.id)}
                onUpdate={(patch) => onUpdateSubject(subject.id, patch)}
                onRemove={() => {
                  onRemoveSubject(subject.id);
                  setEditingId(null);
                }}
              />
            ))}
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
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => onBrush(activityBrush(id))}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-left transition-colors",
                  selected ? "border-blue-600 ring-1 ring-blue-600" : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: meta.edge }} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-gray-900">{meta.name}</span>
                  <span className="block text-xs text-gray-500">{fmtHours(byCategory[id])} h</span>
                </span>
              </button>
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
