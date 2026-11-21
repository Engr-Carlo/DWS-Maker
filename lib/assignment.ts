import {
  DAY_NAMES,
  SLOT_COUNT,
  cellKey,
  formatClock,
  formatLongDate,
  slotStart,
  subjectBrush,
  activityBrush,
  type DwsState,
  type Subject,
  type SubjectKind,
} from "./dws";

/** One lab unit equals three contact hours; one lecture unit equals one hour. */
export const LAB_HOURS_PER_UNIT = 3;

const DAY_ABBR = ["M", "T", "W", "Th", "F", "S"];

export interface LoadRow {
  subject: Subject;
  room: string;
  days: number[];
  startSlot: number;
  endSlot: number;
  hours: number;
  units: number;
}

export interface ConsultRow {
  day: string;
  time: string;
}

export interface AssignmentModel {
  kind: SubjectKind;
  rows: LoadRow[];
  unplaced: Subject[];
  consultations: ConsultRow[];
  totalHours: number;
  totalUnits: number;
  lecCount: number;
  labCount: number;
}

interface Run {
  day: number;
  start: number;
  end: number;
}

function runsFor(cells: DwsState["cells"], brush: string): Run[] {
  const runs: Run[] = [];
  for (let day = 0; day < DAY_NAMES.length; day++) {
    let slot = 0;
    while (slot < SLOT_COUNT) {
      if (cells[cellKey(day, slot)] !== brush) {
        slot++;
        continue;
      }
      let last = slot;
      while (last + 1 < SLOT_COUNT && cells[cellKey(day, last + 1)] === brush) last++;
      runs.push({ day, start: slot, end: last + 1 });
      slot = last + 1;
    }
  }
  return runs;
}

/** Groups the runs that share the same start and end time (so "T" + "F" at 10:00 become one row). */
function groupByTime(runs: Run[]): { start: number; end: number; days: number[] }[] {
  const groups = new Map<string, { start: number; end: number; days: number[] }>();
  for (const run of runs) {
    const key = `${run.start}-${run.end}`;
    const group = groups.get(key) ?? { start: run.start, end: run.end, days: [] };
    group.days.push(run.day);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Math.min(...a.days) - Math.min(...b.days) || a.start - b.start);
}

export const dayCode = (days: number[]) => days.map((d) => DAY_ABBR[d]).join("");

/** "10:00AM to 11:30AM", as written on the form. */
export function timeRange(startSlot: number, endSlot: number, pad: boolean): string {
  const strip = (minutes: number) => formatClock(minutes, pad).replace(" ", "");
  return `${strip(slotStart(startSlot))} to ${strip(slotStart(endSlot))}`;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function usDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

function consecutiveRuns(days: number[]): number[][] {
  const out: number[][] = [];
  for (const day of [...days].sort((a, b) => a - b)) {
    const current = out[out.length - 1];
    if (current && day === current[current.length - 1] + 1) current.push(day);
    else out.push([day]);
  }
  return out;
}

export function consultationRows(state: DwsState): ConsultRow[] {
  const groups = groupByTime(runsFor(state.cells, activityBrush("consultation")));
  const rows: ConsultRow[] = [];
  for (const group of groups) {
    for (const run of consecutiveRuns(group.days)) {
      const first = DAY_NAMES[run[0]];
      const last = DAY_NAMES[run[run.length - 1]];
      rows.push({ day: run.length === 1 ? first : `${first} to ${last}`, time: timeRange(group.start, group.end, false) });
    }
  }
  return rows;
}

export function buildAssignment(state: DwsState, kind: SubjectKind): AssignmentModel {
  const rows: LoadRow[] = [];
  const unplaced: Subject[] = [];
  const lecClasses = new Set<string>();
  const labClasses = new Set<string>();

  for (const subject of state.subjects.filter((s) => s.kind === kind)) {
    const groups = groupByTime(runsFor(state.cells, subjectBrush(subject.id)));
    if (groups.length === 0) {
      unplaced.push(subject);
      continue;
    }
    const preparationKey = `${subject.code.trim().toUpperCase()}\0${subject.section.trim().toUpperCase()}`;
    (subject.component === "lab" ? labClasses : lecClasses).add(preparationKey);
    for (const group of groups) {
      const hours = (group.days.length * (group.end - group.start)) / 2;
      rows.push({
        subject,
        room: subject.room,
        days: group.days,
        startSlot: group.start,
        endSlot: group.end,
        hours,
        units: subject.component === "lab" ? hours / LAB_HOURS_PER_UNIT : hours,
      });
    }
  }

  const combinedRows = new Map<string, LoadRow>();
  for (const row of rows) {
    const key = JSON.stringify([
      row.subject.code.trim().toUpperCase(),
      row.subject.section.trim().toUpperCase(),
      row.subject.title.trim(),
      row.subject.component,
      row.subject.startDate,
      row.days,
      row.startSlot,
      row.endSlot,
    ]);
    const existing = combinedRows.get(key);
    if (!existing) {
      combinedRows.set(key, row);
      continue;
    }
    const rooms = [existing.room, row.room]
      .flatMap((room) => room.split(" / "))
      .map((room) => room.trim())
      .filter(Boolean);
    existing.room = [...new Set(rooms)].join(" / ");
    existing.hours += row.hours;
    existing.units += row.units;
  }
  const finalRows = [...combinedRows.values()];

  return {
    kind,
    rows: finalRows,
    unplaced,
    consultations: consultationRows(state),
    totalHours: finalRows.reduce((sum, r) => sum + r.hours, 0),
    totalUnits: finalRows.reduce((sum, r) => sum + r.units, 0),
    lecCount: lecClasses.size,
    labCount: labClasses.size,
  };
}

export const hasSubjects = (state: DwsState, kind: SubjectKind) => state.subjects.some((s) => s.kind === kind);

export interface MemoText {
  date: string;
  toName: string;
  position: string;
  fromName: string;
  fromTitle: string;
  subject: string;
  intro: string;
  hoursLabel: string;
  prepLabel: string;
  unitsLabel: string;
  vpName: string;
  vpTitle: string;
  conformeName: string;
  conformeRole: string;
}

const SEM_NAMES: Record<string, string> = { "1st": "First Sem", "2nd": "Second Sem", Summer: "Summer" };

/** Every piece of wording shared by the on-screen preview and the Word file. */
export function memoText(state: DwsState, model: AssignmentModel): MemoText {
  const { profile, assignment: a } = state;
  const semName = SEM_NAMES[profile.semester] ?? profile.semester;
  const semPlain = profile.semester === "1st" || profile.semester === "2nd" ? `${profile.semester} semester` : profile.semester;
  const hours = formatNumber(model.totalHours);
  return {
    date: formatLongDate(a.date),
    toName: a.toName || profile.name,
    position: profile.position,
    fromName: a.fromName,
    fromTitle: a.fromTitle,
    subject: `TEACHING ASSIGNMENT, ${semName}, A.Y. ${profile.academicYear}`,
    intro: `Below is your ${model.kind === "overload" ? "overload " : ""}teaching assignment for the ${semPlain}, A.Y. ${profile.academicYear}.`,
    hoursLabel: model.kind === "overload" ? `Overload - ${hours} hours` : `${hours} hours`,
    prepLabel: `${model.lecCount} LEC          ${model.labCount} LAB`,
    unitsLabel: `${formatNumber(model.totalUnits)} units`,
    vpName: a.vpName,
    vpTitle: a.vpTitle,
    conformeName: a.conformeName || profile.name,
    conformeRole: [a.employment, profile.position].filter(Boolean).join("/"),
  };
}

export const TERMS = [
  "Transferring assigned time, days and room of assigned classes without prior approval is prohibited. Likewise, swapping or exchanging of subjects with other faculty members is discouraged.",
  "Complete and finish the entire semester. Resignation or refusal to continue teaching during semester shall be considered a grave offense. In such case, Pamantasan ng Cabuyao (University of Cabuyao) reserves the right to withhold whatever monetary claim is due, until the University has been satisfied that the teaching personnel has reasonably fulfilled his/her remaining obligations.",
  "Submit/update OBTLP and workbook.",
  "Meet the deadline set for the submission of grades.",
];

export function assignmentFileName(state: DwsState, kind: SubjectKind): string {
  const who = (state.assignment.toName || state.profile.name).trim();
  const sem = state.profile.semester === "1st" || state.profile.semester === "2nd" ? `${state.profile.semester}Sem` : state.profile.semester;
  const label = kind === "regular" ? "Regular Loads" : "Overload Loads";
  return `${[who, sem, label].filter(Boolean).join("_").replace(/[\\/:*?"<>|]+/g, "")}.docx`;
}
