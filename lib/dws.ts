export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const SLOT_COUNT = 26;
const DAY_START_MINUTES = 7 * 60;

export function formatClock(minutes: number, pad = false): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hour = pad ? String(h12).padStart(2, "0") : String(h12);
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const slotStart = (slot: number) => DAY_START_MINUTES + slot * 30;

export const slotLabel = (slot: number) =>
  `${formatClock(slotStart(slot), true)}-${formatClock(slotStart(slot) + 30, true)}`;

export type CategoryId =
  | "regular"
  | "overload"
  | "research"
  | "extension"
  | "consultation"
  | "quasi"
  | "admin"
  | "break";

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  summaryLabel: string;
  cellLabel: string;
  /** Colour used on the official form (preview, print, .docx). */
  fill: string;
  /** Text colour on the official form fill. */
  formInk: string;
  /** Softer colours used in the editor. */
  soft: string;
  ink: string;
  edge: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "regular", name: "Regular teaching", summaryLabel: "Regular Teaching Hrs.", cellLabel: "", fill: "#538135", formInk: "#FFFFFF", soft: "#E6EFDF", ink: "#2F5A1B", edge: "#538135" },
  { id: "overload", name: "Overload teaching", summaryLabel: "Overload Teaching Hrs.", cellLabel: "", fill: "#FF0000", formInk: "#FFFFFF", soft: "#FCE4E4", ink: "#9B1C1C", edge: "#DC2626" },
  { id: "research", name: "Research", summaryLabel: "Research Hrs.", cellLabel: "Research Hours", fill: "#FFD966", formInk: "#000000", soft: "#FFF3CC", ink: "#6B5300", edge: "#D4A72C" },
  { id: "extension", name: "Com. Extension", summaryLabel: "Com. Extension Hrs.", cellLabel: "Com. Ext. Hours", fill: "#F4B083", formInk: "#000000", soft: "#FCE5D6", ink: "#7A3E12", edge: "#E58A4F" },
  { id: "consultation", name: "Consultation", summaryLabel: "Consultation Hrs.", cellLabel: "Consultation Hours", fill: "#D9D9D9", formInk: "#000000", soft: "#EEEEEE", ink: "#404040", edge: "#9CA3AF" },
  { id: "quasi", name: "Quasi", summaryLabel: "Quasi Hrs.", cellLabel: "Quasi Hours", fill: "#FFC000", formInk: "#000000", soft: "#FFEBB5", ink: "#6B4A00", edge: "#E6A800" },
  { id: "admin", name: "Administrative", summaryLabel: "Administrative Hrs.", cellLabel: "Administrative", fill: "#9CC2E5", formInk: "#000000", soft: "#DDEBF7", ink: "#1F4E79", edge: "#6FA3D1" },
  { id: "break", name: "Break", summaryLabel: "Break", cellLabel: "Break", fill: "#F2F2F2", formInk: "#000000", soft: "#F3F4F6", ink: "#6B7280", edge: "#9CA3AF" },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>;

export const ACTIVITY_IDS: CategoryId[] = ["research", "extension", "consultation", "quasi", "admin", "break"];

export type SubjectKind = "regular" | "overload";

export interface Subject {
  id: string;
  code: string;
  section: string;
  hours: number;
  kind: SubjectKind;
}

export interface Profile {
  name: string;
  position: string;
  department: string;
  designation: string;
  semester: string;
  academicYear: string;
  effectivityDate: string;
}

export interface Signoff {
  endorserName: string;
  endorserTitle: string;
  approverName: string;
  approverTitle: string;
}

/** Maps "day-slot" (e.g. "0-6") to a brush id. */
export type Cells = Record<string, string>;

export interface DwsState {
  profile: Profile;
  signoff: Signoff;
  subjects: Subject[];
  cells: Cells;
  includeBreak: boolean;
}

export const ERASER = "eraser";
export const subjectBrush = (id: string) => `subject:${id}`;
export const activityBrush = (id: CategoryId) => `activity:${id}`;
export const cellKey = (day: number, slot: number) => `${day}-${slot}`;

export interface Resolved {
  category: CategoryId;
  title: string;
  subtitle: string;
}

export function resolveBrush(brush: string, subjects: Subject[]): Resolved | null {
  if (brush.startsWith("subject:")) {
    const id = brush.slice("subject:".length);
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return null;
    return { category: subject.kind, title: subject.code.trim() || "Subject", subtitle: subject.section.trim() };
  }
  if (brush.startsWith("activity:")) {
    const id = brush.slice("activity:".length) as CategoryId;
    if (!ACTIVITY_IDS.includes(id)) return null;
    return { category: id, title: CATEGORY_BY_ID[id].cellLabel, subtitle: "" };
  }
  return null;
}

export interface CellView {
  brush: string;
  res: Resolved;
  start: boolean;
  end: boolean;
  length: number;
}

/** Indexed [slot][day]; consecutive slots with the same brush form one block. */
export function buildGrid(cells: Cells, subjects: Subject[]): (CellView | null)[][] {
  const grid: (CellView | null)[][] = Array.from({ length: SLOT_COUNT }, () => Array<CellView | null>(DAYS.length).fill(null));
  for (let day = 0; day < DAYS.length; day++) {
    let slot = 0;
    while (slot < SLOT_COUNT) {
      const brush = cells[cellKey(day, slot)];
      const res = brush ? resolveBrush(brush, subjects) : null;
      if (!brush || !res) {
        slot++;
        continue;
      }
      let last = slot;
      while (last + 1 < SLOT_COUNT && cells[cellKey(day, last + 1)] === brush) last++;
      const length = last - slot + 1;
      for (let s = slot; s <= last; s++) {
        grid[s][day] = { brush, res, start: s === slot, end: s === last, length };
      }
      slot = last + 1;
    }
  }
  return grid;
}

export function hoursByCategory(cells: Cells, subjects: Subject[]): Record<CategoryId, number> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;
  for (const brush of Object.values(cells)) {
    const res = resolveBrush(brush, subjects);
    if (res) totals[res.category] += 0.5;
  }
  return totals;
}

export function hoursBySubject(cells: Cells): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const brush of Object.values(cells)) {
    if (!brush.startsWith("subject:")) continue;
    const id = brush.slice("subject:".length);
    totals[id] = (totals[id] ?? 0) + 0.5;
  }
  return totals;
}

export function totalHours(byCategory: Record<CategoryId, number>, includeBreak: boolean): number {
  return CATEGORIES.reduce((sum, c) => (c.id === "break" && !includeBreak ? sum : sum + byCategory[c.id]), 0);
}

export function fmtHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Form convention: put N/A when a category is not applicable. */
export function formHours(n: number): string {
  return n > 0 ? fmtHours(n) : "N/A";
}

/** Returns the new cells object, or the same object when nothing changed. */
export function applyPaint(cells: Cells, keys: string[], brush: string, erase: boolean): Cells {
  let next: Cells | null = null;
  for (const key of keys) {
    const current = (next ?? cells)[key];
    if (erase) {
      if (current === undefined) continue;
      if (!next) next = { ...cells };
      delete next[key];
    } else {
      if (current === brush) continue;
      if (!next) next = { ...cells };
      next[key] = brush;
    }
  }
  return next ?? cells;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

export function semesterLabel(semester: string): string {
  if (semester === "1st" || semester === "2nd") return `${semester} Semester`;
  return semester;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function newSubject(kind: SubjectKind = "regular"): Subject {
  return { id: newId(), code: "", section: "", hours: 3, kind };
}

function currentAcademicYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export function defaultState(): DwsState {
  return {
    profile: {
      name: "",
      position: "",
      department: "",
      designation: "N/A",
      semester: "1st",
      academicYear: currentAcademicYear(),
      effectivityDate: "",
    },
    signoff: { endorserName: "", endorserTitle: "Program Chair", approverName: "", approverTitle: "Dean / VPASS" },
    subjects: [],
    cells: {},
    includeBreak: false,
  };
}

export function isBlank(state: DwsState): boolean {
  const { profile, signoff } = state;
  return (
    state.subjects.length === 0 &&
    Object.keys(state.cells).length === 0 &&
    !profile.name &&
    !profile.position &&
    !profile.department &&
    !signoff.endorserName &&
    !signoff.approverName
  );
}

export function exampleState(): DwsState {
  const subjects: Subject[] = [
    { id: "ex-1", code: "CPP118", section: "4CPEB", hours: 6, kind: "regular" },
    { id: "ex-2", code: "CPP117", section: "4CPEA", hours: 6, kind: "regular" },
    { id: "ex-3", code: "CPP117", section: "4CPEB", hours: 6, kind: "regular" },
    { id: "ex-4", code: "CPP118", section: "4CPEA", hours: 6, kind: "regular" },
    { id: "ex-5", code: "CPP118", section: "4CPEC", hours: 6, kind: "overload" },
    { id: "ex-6", code: "CPP117", section: "4CPEC", hours: 6, kind: "overload" },
  ];
  const cells: Cells = {};
  const fill = (day: number, from: number, to: number, brush: string) => {
    for (let slot = from; slot < to; slot++) cells[cellKey(day, slot)] = brush;
  };
  const s = (n: number) => subjectBrush(`ex-${n}`);

  [s(1), s(2), s(2), s(3), s(4)].forEach((b, day) => fill(day, 0, 6, b));
  for (let day = 0; day < 5; day++) fill(day, 6, 7, activityBrush("break"));
  [activityBrush("quasi"), s(4), s(3), activityBrush("quasi"), s(1)].forEach((b, day) => fill(day, 7, 13, b));
  for (let day = 0; day < 5; day++) fill(day, 13, 14, activityBrush("break"));
  [s(5), s(5), activityBrush("research"), s(6), s(6)].forEach((b, day) => fill(day, 14, 20, b));
  fill(0, 20, 24, activityBrush("consultation"));
  fill(1, 20, 24, activityBrush("consultation"));
  fill(2, 20, 23, activityBrush("extension"));
  fill(3, 20, 23, activityBrush("extension"));

  return {
    profile: {
      name: "JUAN D. DELA CRUZ",
      position: "Instructor 1",
      department: "COLLEGE OF ENGINEERING",
      designation: "N/A",
      semester: "1st",
      academicYear: "2026-2027",
      effectivityDate: "2026-06-29",
    },
    signoff: {
      endorserName: "Engr. Ana Reyes",
      endorserTitle: "Program Chair",
      approverName: "Dr. Pedro Garcia / Dr. Luis Mendoza",
      approverTitle: "Dean / VPASS",
    },
    subjects,
    cells,
    includeBreak: false,
  };
}

const STORAGE_KEY = "dws-maker:v1";
const CELL_KEY = /^[0-5]-(?:\d|1\d|2[0-5])$/;

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function sanitizeState(raw: unknown): DwsState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const base = defaultState();
  const p = (r.profile && typeof r.profile === "object" ? r.profile : {}) as Record<string, unknown>;
  const so = (r.signoff && typeof r.signoff === "object" ? r.signoff : {}) as Record<string, unknown>;

  const subjects: Subject[] = Array.isArray(r.subjects)
    ? r.subjects.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const s = item as Record<string, unknown>;
        if (typeof s.id !== "string" || !s.id) return [];
        const hours = typeof s.hours === "number" && Number.isFinite(s.hours) && s.hours >= 0 ? s.hours : 3;
        const kind: SubjectKind = s.kind === "overload" ? "overload" : "regular";
        return [{ id: s.id, code: text(s.code, ""), section: text(s.section, ""), hours, kind }];
      })
    : [];

  const cells: Cells = {};
  if (r.cells && typeof r.cells === "object") {
    for (const [key, brush] of Object.entries(r.cells as Record<string, unknown>)) {
      if (CELL_KEY.test(key) && typeof brush === "string" && resolveBrush(brush, subjects)) cells[key] = brush;
    }
  }

  return {
    profile: {
      name: text(p.name, base.profile.name),
      position: text(p.position, base.profile.position),
      department: text(p.department, base.profile.department),
      designation: text(p.designation, base.profile.designation),
      semester: text(p.semester, base.profile.semester),
      academicYear: text(p.academicYear, base.profile.academicYear),
      effectivityDate: text(p.effectivityDate, base.profile.effectivityDate),
    },
    signoff: {
      endorserName: text(so.endorserName, ""),
      endorserTitle: text(so.endorserTitle, base.signoff.endorserTitle),
      approverName: text(so.approverName, ""),
      approverTitle: text(so.approverTitle, base.signoff.approverTitle),
    },
    subjects,
    cells,
    includeBreak: r.includeBreak === true,
  };
}

export function loadState(): DwsState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = sanitizeState(JSON.parse(saved));
      if (state) return state;
    }
  } catch {
    // fall through to a fresh state
  }
  return defaultState();
}

export function saveState(state: DwsState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage may be unavailable (private mode); the tool still works
  }
}

export function fileBaseName(state: DwsState): string {
  const parts = ["DWS", state.profile.name.trim(), `${state.profile.semester} Sem`, state.profile.academicYear.trim()]
    .filter(Boolean)
    .join(" - ");
  return parts.replace(/[\\/:*?"<>|]+/g, "").trim() || "DWS";
}

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
