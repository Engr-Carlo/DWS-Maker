"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type Category =
  | "regular"
  | "overload"
  | "research"
  | "extension"
  | "consultation"
  | "quasi"
  | "admin"
  | "break";
type LoadType = "regular" | "overload";

type LoadEntry = {
  id: string;
  course: string;
  section: string;
  hours: number;
  type: LoadType;
};

type Block = {
  id: string;
  day: Day;
  slotIndex: number;
  category: Category;
  label: string;
  loadId?: string;
};

const DAYS: Day[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CATEGORY_META: Record<
  Category,
  { label: string; color: string; accent: string; short: string }
> = {
  regular: { label: "Regular Teaching", color: "bg-blue-500/15", accent: "text-blue-700", short: "REG" },
  overload: { label: "Overload Teaching", color: "bg-cyan-500/15", accent: "text-cyan-700", short: "OVL" },
  research: { label: "Research", color: "bg-emerald-500/15", accent: "text-emerald-700", short: "RES" },
  extension: { label: "Com. Extension", color: "bg-amber-500/15", accent: "text-amber-700", short: "EXT" },
  consultation: { label: "Consultation", color: "bg-violet-500/15", accent: "text-violet-700", short: "CONS" },
  quasi: { label: "Quasi", color: "bg-rose-500/15", accent: "text-rose-700", short: "QUASI" },
  admin: { label: "Administrative", color: "bg-slate-500/15", accent: "text-slate-700", short: "ADMIN" },
  break: { label: "Break", color: "bg-zinc-200", accent: "text-zinc-700", short: "BRK" },
};

const TIME_SLOTS = Array.from({ length: 26 }, (_, index) => {
  const minutes = 7 * 60 + index * 30;
  const nextMinutes = minutes + 30;
  const formatTime = (m: number) => {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalized = hours % 12 === 0 ? 12 : hours % 12;
    return `${normalized}:${String(mins).padStart(2, "0")} ${suffix}`;
  };

  return {
    index,
    start: minutes,
    label: `${formatTime(minutes)} - ${formatTime(nextMinutes)}`,
  };
});

const INITIAL_PROFILE = {
  name: "ENGR. CARLO B. CIMACIO",
  positionTitle: "Instructor 1",
  department: "COLLEGE OF ENGINEERING",
  designation: "NA",
  semester: "1st",
  academicYear: "2026-2027",
  effectivityDate: "2026-06-29",
};

const INITIAL_LOAD: LoadEntry[] = [
  { id: "1", course: "CPP118", section: "4CPEB", hours: 3, type: "regular" },
  { id: "2", course: "CPP117", section: "4CPEA", hours: 3, type: "regular" },
  { id: "3", course: "CPP117", section: "4CPEB", hours: 3, type: "regular" },
  { id: "4", course: "CPP118", section: "4CPEA", hours: 3, type: "regular" },
  { id: "5", course: "CPP118", section: "4CPEC", hours: 3, type: "regular" },
];

const STARTER_BLOCKS: Block[] = [
  { id: "b1", day: "MON", slotIndex: 0, category: "regular", label: "CPP118 • 4CPEB", loadId: "1" },
  { id: "b2", day: "MON", slotIndex: 1, category: "regular", label: "CPP118 • 4CPEB", loadId: "1" },
  { id: "b3", day: "TUE", slotIndex: 0, category: "regular", label: "CPP117 • 4CPEA", loadId: "2" },
  { id: "b4", day: "TUE", slotIndex: 1, category: "regular", label: "CPP117 • 4CPEA", loadId: "2" },
  { id: "b5", day: "WED", slotIndex: 0, category: "regular", label: "CPP117 • 4CPEB", loadId: "3" },
  { id: "b6", day: "WED", slotIndex: 1, category: "regular", label: "CPP117 • 4CPEB", loadId: "3" },
  { id: "b7", day: "THU", slotIndex: 0, category: "regular", label: "CPP118 • 4CPEA", loadId: "4" },
  { id: "b8", day: "THU", slotIndex: 1, category: "regular", label: "CPP118 • 4CPEA", loadId: "4" },
  { id: "b9", day: "FRI", slotIndex: 0, category: "regular", label: "CPP118 • 4CPEC", loadId: "5" },
  { id: "b10", day: "FRI", slotIndex: 1, category: "regular", label: "CPP118 • 4CPEC", loadId: "5" },
  { id: "b11", day: "MON", slotIndex: 10, category: "break", label: "Break" },
];

const CATEGORY_ORDER: Category[] = [
  "regular",
  "overload",
  "research",
  "extension",
  "consultation",
  "quasi",
  "admin",
  "break",
];

const STORAGE_KEY = "dws-maker-tool-state";

function readSavedState() {
  if (typeof window === "undefined") {
    return {
      profile: INITIAL_PROFILE,
      loadEntries: INITIAL_LOAD,
      blocks: STARTER_BLOCKS,
      endorser: "Engr. Aldrin Soriano",
      approver: "Dr. Rizal Mosquera / Dr. George V. Lambot",
      includeBreakInTotal: false,
      selectedCategory: "regular" as Category,
      selectedLoadId: INITIAL_LOAD[0]?.id ?? "",
    };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return {
        profile: INITIAL_PROFILE,
        loadEntries: INITIAL_LOAD,
        blocks: STARTER_BLOCKS,
        endorser: "Engr. Aldrin Soriano",
        approver: "Dr. Rizal Mosquera / Dr. George V. Lambot",
        includeBreakInTotal: false,
        selectedCategory: "regular" as Category,
        selectedLoadId: INITIAL_LOAD[0]?.id ?? "",
      };
    }

    const parsed = JSON.parse(saved) as {
      profile?: typeof INITIAL_PROFILE;
      loadEntries?: LoadEntry[];
      blocks?: Block[];
      endorser?: string;
      approver?: string;
      includeBreakInTotal?: boolean;
      selectedCategory?: Category;
    };

    return {
      profile: parsed.profile ?? INITIAL_PROFILE,
      loadEntries: parsed.loadEntries ?? INITIAL_LOAD,
      blocks: parsed.blocks ?? STARTER_BLOCKS,
      endorser: parsed.endorser ?? "Engr. Aldrin Soriano",
      approver: parsed.approver ?? "Dr. Rizal Mosquera / Dr. George V. Lambot",
      includeBreakInTotal: parsed.includeBreakInTotal ?? false,
      selectedCategory: parsed.selectedCategory ?? "regular",
      selectedLoadId: parsed.loadEntries?.[0]?.id ?? INITIAL_LOAD[0]?.id ?? "",
    };
  } catch {
    return {
      profile: INITIAL_PROFILE,
      loadEntries: INITIAL_LOAD,
      blocks: STARTER_BLOCKS,
      endorser: "Engr. Aldrin Soriano",
      approver: "Dr. Rizal Mosquera / Dr. George V. Lambot",
      includeBreakInTotal: false,
      selectedCategory: "regular" as Category,
      selectedLoadId: INITIAL_LOAD[0]?.id ?? "",
    };
  }
}

export default function Home() {
  const savedState = readSavedState();
  const [profile, setProfile] = useState(savedState.profile);
  const [loadEntries, setLoadEntries] = useState<LoadEntry[]>(savedState.loadEntries);
  const [blocks, setBlocks] = useState<Block[]>(savedState.blocks);
  const [selectedCategory, setSelectedCategory] = useState<Category>(savedState.selectedCategory);
  const [selectedLoadId, setSelectedLoadId] = useState<string>(savedState.selectedLoadId);
  const [endorser, setEndorser] = useState(savedState.endorser);
  const [approver, setApprover] = useState(savedState.approver);
  const [includeBreakInTotal, setIncludeBreakInTotal] = useState(savedState.includeBreakInTotal);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile,
        loadEntries,
        blocks,
        endorser,
        approver,
        includeBreakInTotal,
        selectedCategory,
      }),
    );
  }, [profile, loadEntries, blocks, endorser, approver, includeBreakInTotal, selectedCategory]);

  const scheduleStats = useMemo(() => {
    const totalPlaced = blocks.length * 0.5;
    const coverage = loadEntries.reduce((sum, item) => sum + item.hours, 0);
    const remaining = Math.max(coverage - totalPlaced, 0);

    return {
      totalPlaced,
      coverage,
      remaining,
    };
  }, [blocks.length, loadEntries]);

  const categoryTotals = useMemo(() => {
    return CATEGORY_ORDER.reduce((acc, category) => {
      acc[category] = blocks
        .filter((block) => block.category === category)
        .reduce((sum) => sum + 0.5, 0);
      return acc;
    }, {} as Record<Category, number>);
  }, [blocks]);

  const totalFormHours = useMemo(() => {
    return CATEGORY_ORDER.reduce((sum, category) => {
      if (!includeBreakInTotal && category === "break") return sum;
      return sum + categoryTotals[category];
    }, 0);
  }, [categoryTotals, includeBreakInTotal]);

  const totalAssignedLoad = useMemo(
    () => loadEntries.reduce((sum, item) => sum + item.hours, 0),
    [loadEntries],
  );

  const blockMap = useMemo(() => {
    const map = new Map<string, Block>();
    blocks.forEach((block) => {
      map.set(`${block.day}-${block.slotIndex}`, block);
    });
    return map;
  }, [blocks]);

  const resetSample = () => {
    setProfile(INITIAL_PROFILE);
    setLoadEntries(INITIAL_LOAD);
    setBlocks(STARTER_BLOCKS);
    setEndorser("Engr. Aldrin Soriano");
    setApprover("Dr. Rizal Mosquera / Dr. George V. Lambot");
    setIncludeBreakInTotal(false);
    setSelectedCategory("regular");
    setSelectedLoadId(INITIAL_LOAD[0]?.id ?? "");
  };

  const addPresetEntry = (preset: Partial<LoadEntry>) => {
    const id = `entry-${Date.now()}`;
    const newEntry: LoadEntry = {
      id,
      course: preset.course ?? "NEW101",
      section: preset.section ?? "A",
      hours: preset.hours ?? 3,
      type: preset.type ?? "regular",
    };
    setLoadEntries((current) => [...current, newEntry]);
    setSelectedLoadId(id);
  };

  const addLoadEntry = () => {
    addPresetEntry({
      course: "NEW101",
      section: "A",
      hours: 3,
      type: "regular",
    });
  };

  const updateLoadEntry = (id: string, field: keyof LoadEntry, value: string | number) => {
    setLoadEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]: value,
            }
          : entry,
      ),
    );
  };

  const removeLoadEntry = (id: string) => {
    setLoadEntries((current) => current.filter((entry) => entry.id !== id));
    setBlocks((current) => current.filter((block) => block.loadId !== id));
    setSelectedLoadId((current) => (current === id ? "" : current));
  };

  const handleCellClick = (day: Day, slotIndex: number) => {
    const existing = blockMap.get(`${day}-${slotIndex}`);

    if (existing) {
      setBlocks((current) => current.filter((block) => !(block.day === day && block.slotIndex === slotIndex)));
      return;
    }

    const chosenLoad = loadEntries.find((entry) => entry.id === selectedLoadId);

    const label =
      selectedCategory === "regular" || selectedCategory === "overload"
        ? chosenLoad
          ? `${chosenLoad.course} • ${chosenLoad.section}`
          : "Unassigned load"
        : CATEGORY_META[selectedCategory].label;

    setBlocks((current) => {
      const nextId = `block-${day}-${slotIndex}-${current.length + 1}`;
      return [
        ...current,
        {
          id: nextId,
          day,
          slotIndex,
          category: selectedCategory,
          label,
          loadId: chosenLoad?.id,
        },
      ];
    });
  };

  const exportToDocx = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: "DECLARATION OF WORK SCHEDULE", bold: true, size: 28 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Name: ${profile.name}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Position Title: ${profile.positionTitle}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Department/Office: ${profile.department}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Semester: ${profile.semester} | A.Y.: ${profile.academicYear}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Endorsed by: ${endorser}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Approved by: ${approver}` }),
              ],
            }),
            new Paragraph({
              spacing: { before: 300, after: 200 },
              children: [
                new TextRun({ text: "Summary", bold: true }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Category")] }),
                    new TableCell({ children: [new Paragraph("Hours")] }),
                  ],
                }),
                ...CATEGORY_ORDER.filter((category) => (includeBreakInTotal || category !== "break")).map((category) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(CATEGORY_META[category].label)] }),
                      new TableCell({ children: [new Paragraph(String(categoryTotals[category]))] }),
                    ],
                  }),
                ),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(totalFormHours.toFixed(1)), bold: true })] })] }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${profile.name.replace(/\s+/g, "-").toLowerCase()}-dws.docx`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">DWS Maker</p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Declaration of Work Schedule Builder</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetSample}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Reset sample
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Print / PDF
              </button>
              <button
                type="button"
                onClick={exportToDocx}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
              >
                Export DOCX
              </button>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Scheduled</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{scheduleStats.totalPlaced.toFixed(1)}h</span>
              <span className="text-xs text-cyan-100">on grid</span>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Coverage</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{scheduleStats.coverage.toFixed(1)}h</span>
              <span className="text-xs text-emerald-100">assigned</span>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">Remaining</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{scheduleStats.remaining.toFixed(1)}h</span>
              <span className="text-xs text-violet-100">to place</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Faculty profile</h2>
                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Form header
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Name</span>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none ring-0 transition focus:border-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Position Title</span>
                  <input
                    value={profile.positionTitle}
                    onChange={(event) => setProfile((current) => ({ ...current, positionTitle: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none ring-0 transition focus:border-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Department / Office</span>
                  <input
                    value={profile.department}
                    onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none ring-0 transition focus:border-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Designation</span>
                  <input
                    value={profile.designation}
                    onChange={(event) => setProfile((current) => ({ ...current, designation: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none ring-0 transition focus:border-cyan-400"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-slate-300">Semester</span>
                    <input
                      value={profile.semester}
                      onChange={(event) => setProfile((current) => ({ ...current, semester: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-slate-300">A.Y.</span>
                    <input
                      value={profile.academicYear}
                      onChange={(event) => setProfile((current) => ({ ...current, academicYear: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Effectivity Date</span>
                  <input
                    type="date"
                    value={profile.effectivityDate}
                    onChange={(event) => setProfile((current) => ({ ...current, effectivityDate: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Assigned load</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addPresetEntry({ course: "RES101", section: "R1", hours: 3, type: "regular" })}
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    + Research
                  </button>
                  <button
                    type="button"
                    onClick={addLoadEntry}
                    className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    Add item
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {loadEntries.map((entry) => (
                  <div key={entry.id} className={`rounded-2xl border p-3 ${selectedLoadId === entry.id ? "border-cyan-400/70 bg-cyan-500/10" : "border-white/10 bg-slate-950/50"}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLoadId(entry.id)}
                        className="text-left text-sm font-semibold text-white"
                      >
                        {entry.course} • {entry.section}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLoadEntry(entry.id)}
                        className="text-xs text-slate-400 transition hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="block">
                        <span className="mb-1 block text-slate-400">Course</span>
                        <input
                          value={entry.course}
                          onChange={(event) => updateLoadEntry(entry.id, "course", event.target.value.toUpperCase())}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-slate-400">Section</span>
                        <input
                          value={entry.section}
                          onChange={(event) => updateLoadEntry(entry.id, "section", event.target.value.toUpperCase())}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-slate-400">Hours</span>
                        <input
                          type="number"
                          min={1}
                          value={entry.hours}
                          onChange={(event) => updateLoadEntry(entry.id, "hours", Number(event.target.value) || 0)}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-white outline-none focus:border-cyan-400"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-slate-400">Type</span>
                        <select
                          value={entry.type}
                          onChange={(event) => updateLoadEntry(entry.id, "type", event.target.value as LoadType)}
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-2 py-1.5 text-white outline-none focus:border-cyan-400"
                        >
                          <option value="regular">Regular</option>
                          <option value="overload">Overload</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Weekly planner</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Schedule grid</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORY_ORDER.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      selectedCategory === category
                        ? "border-slate-100 bg-white text-slate-950"
                        : "border-white/10 bg-slate-950/60 text-slate-300"
                    }`}
                  >
                    {CATEGORY_META[category].short}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[900px] rounded-2xl border border-white/10 bg-slate-950/60 p-2">
                <div className="grid grid-cols-[90px_repeat(6,minmax(120px,1fr))] gap-1">
                  <div className="rounded-xl bg-slate-900 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Time
                  </div>
                  {DAYS.map((day) => (
                    <div key={day} className="rounded-xl bg-slate-900 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {day}
                    </div>
                  ))}

                  {TIME_SLOTS.map((slot) => (
                    <Fragment key={`slot-row-${slot.index}`}>
                      <div className="flex items-stretch rounded-xl border border-white/5 bg-slate-900/80 px-2 py-3 text-[10px] font-medium text-slate-300">
                        {slot.label}
                      </div>
                      {DAYS.map((day) => {
                        const block = blockMap.get(`${day}-${slot.index}`);
                        const isActive = !!block;
                        return (
                          <button
                            key={`${day}-${slot.index}`}
                            type="button"
                            onClick={() => handleCellClick(day, slot.index)}
                            className={`relative min-h-[68px] rounded-xl border p-1 text-left transition ${
                              isActive
                                ? `${CATEGORY_META[block!.category].color} border-white/20 text-slate-900 ring-2 ring-cyan-300/40`
                                : "border-dashed border-white/10 bg-slate-950/80 text-slate-500 hover:border-cyan-400/40 hover:bg-slate-800"
                            }`}
                          >
                            {isActive && (
                              <span className={`block text-[10px] font-bold ${CATEGORY_META[block!.category].accent}`}>
                                {block!.label}
                              </span>
                            )}
                            {!isActive && (
                              <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                Add
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Summary</h2>
                <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeBreakInTotal}
                    onChange={(event) => setIncludeBreakInTotal(event.target.checked)}
                  />
                  Include break
                </label>
              </div>

              <div className="space-y-3">
                {CATEGORY_ORDER.map((category) => (
                  <div key={category} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${category === "regular" ? "bg-blue-400" : category === "overload" ? "bg-cyan-400" : category === "research" ? "bg-emerald-400" : category === "extension" ? "bg-amber-400" : category === "consultation" ? "bg-violet-400" : category === "quasi" ? "bg-rose-400" : category === "admin" ? "bg-slate-400" : "bg-zinc-300"}`} />
                      <span className="text-slate-300">{CATEGORY_META[category].label}</span>
                    </div>
                    <span className="font-semibold text-white">{categoryTotals[category].toFixed(1)}h</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <div className="flex items-center justify-between text-sm text-cyan-100">
                  <span>Total on form</span>
                  <span className="text-2xl font-bold text-white">{totalFormHours.toFixed(1)}h</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Endorsement</h2>
              </div>

              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Endorsed by</span>
                  <input
                    value={endorser}
                    onChange={(event) => setEndorser(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-slate-300">Approved by</span>
                  <input
                    value={approver}
                    onChange={(event) => setApprover(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition focus:border-cyan-400"
                  />
                </label>
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-3 text-slate-300">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Load coverage</div>
                  <div className="mt-2 text-2xl font-bold text-white">{totalAssignedLoad.toFixed(1)}h</div>
                  <div className="mt-1 text-xs text-slate-400">Across {(loadEntries.length || 0)} assigned courses</div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
