# Declaration of Work Schedule Builder

A Next.js web app that replaces the manual "plot it into the Word form" workflow.
You enter the faculty load given by the Program Chair, the app helps you place
teaching and administrative hours on a Mon–Sat grid, checks the totals, and
exports a ready-to-sign **.docx** (and print-ready PDF) that matches the
University of Cabuyao form (PNC:AF-FO-96).

---

## 1. What the form actually requires

Reverse-engineered from `Declaration-of-Works_2026_v2.docx`:

| Item | Detail |
|---|---|
| Header block | Name, Position Title, Dept/Office, Designation, Semester, A.Y., Effectivity Date |
| Grid | Mon–Sat columns, rows of 30-minute slots from 7:00 AM to 8:00 PM (26 slots) |
| Block categories | Regular Teaching, Overload Teaching, Research, Com. Extension, Consultation, Quasi, Administrative, Break |
| Summary box | Hours per category + TOTAL |
| Sign-off | Endorsed by (Program Chair), Approved by (Dean / VPASS), dates, faculty signature |
| Letterhead | Republic of the Philippines / Pamantasan ng Cabuyao / HRMD header, form code, footer images |

Your current sample, for reference (also a good seed/test fixture):

| Category | Hours |
|---|---|
| Regular teaching | 24 |
| Overload teaching | 12 |
| Research | 3 |
| Com. Extension | 3 |
| Consultation | 4 |
| Quasi | 6 |
| Administrative | N/A |
| Break | 5 |
| **Total on form** | **52** |

> Note: 24 + 12 + 3 + 3 + 4 + 6 = 52, so the form's TOTAL **excludes** break hours.
> Make "include breaks in total" a setting rather than hard-coding it.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Your plan; types keep the time maths safe |
| Styling | Tailwind CSS (+ shadcn/ui optional) | Fast to build the grid and forms |
| State | Zustand with `persist` middleware | Simple store, auto-saves to localStorage |
| Validation | Zod | Validates forms and imported JSON files |
| DOCX export | `docx` + `file-saver` | Runs in the browser, supports merged cells (`rowSpan`/`columnSpan`) |
| PDF export | Print stylesheet (`@media print`) | No server needed; browser "Save as PDF" |
| Tests | Vitest | Unit-test hours, conflicts, and merge logic |
| Hosting | Vercel (static-friendly) | No backend required for the MVP |

No database is needed for v1. Everything lives in the browser, and the schedule
can be saved or loaded as a JSON file. Add auth and a database only in phase 4.

---

## 3. Data model

Store time as **minutes from midnight** and snap everything to 30 minutes.
Never store formatted strings like `"07:00 AM"`.

```ts
// lib/types.ts
export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export const DAYS: Day[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export type Category =
  | "regular" | "overload" | "research" | "extension"
  | "consultation" | "quasi" | "admin" | "break";

export interface Profile {
  name: string;            // "ENGR. CARLO B. CIMACIO"
  positionTitle: string;   // "Instructor 1"
  department: string;      // "COLLEGE OF ENGINEERING"
  designation: string;     // "NA"
  semester: string;        // "1st"
  academicYear: string;    // "2026-2027"
  effectivityDate: string; // ISO date
}

export interface Signatory {
  role: "endorser" | "approver";
  name: string;
  title: string;           // "Program Chair-CPE", "Dean / VPASS"
}

/** What the chair assigned you: "CPP118, 4CPEB, 3 hrs/week, regular" */
export interface LoadItem {
  id: string;
  courseCode: string;      // "CPP118"
  section: string;         // "4CPEB"
  hoursPerWeek: number;    // contact hours for this section
  type: "regular" | "overload";
}

/** One contiguous block on the grid */
export interface Block {
  id: string;
  day: Day;
  start: number;           // minutes from midnight, e.g. 420 = 7:00 AM
  end: number;             // exclusive, e.g. 600 = 10:00 AM
  category: Category;
  loadItemId?: string;     // links teaching blocks back to the load
  label?: string;          // free text for admin blocks
}

export interface Schedule {
  profile: Profile;
  signatories: Signatory[];
  load: LoadItem[];
  blocks: Block[];
  settings: Settings;
}

export interface Settings {
  includeBreakInTotal: boolean;       // false matches your current form
  requiredHours: Partial<Record<Category, number>>; // see section 6
}
```

---

## 4. Core logic

### 4.1 Time helpers

```ts
// lib/time.ts
export const DAY_START = 7 * 60;   // 7:00 AM
export const DAY_END = 20 * 60;    // 8:00 PM
export const SLOT = 30;
export const SLOT_COUNT = (DAY_END - DAY_START) / SLOT; // 26

export function fmt(min: number) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const slotStart = (i: number) => DAY_START + i * SLOT;
export const slotLabel = (i: number) => `${fmt(slotStart(i))}-${fmt(slotStart(i) + SLOT)}`;
```

Generating labels (instead of typing them by hand) avoids label typos such as
"11:30 AM-12:00 AM" on the current form, which should read 12:00 PM.

### 4.2 Hours per category

```ts
// lib/hours.ts
import { Block, Category } from "./types";

export const CATEGORIES: Category[] = [
  "regular","overload","research","extension","consultation","quasi","admin","break",
];

export function hoursByCategory(blocks: Block[]) {
  const totals = Object.fromEntries(CATEGORIES.map(c => [c, 0])) as Record<Category, number>;
  for (const b of blocks) totals[b.category] += (b.end - b.start) / 60;
  return totals;
}

export function grandTotal(t: Record<Category, number>, includeBreak: boolean) {
  return CATEGORIES
    .filter(c => includeBreak || c !== "break")
    .reduce((sum, c) => sum + t[c], 0);
}
```

### 4.3 Conflict detection

```ts
// lib/conflicts.ts
import { Block } from "./types";

export function findConflicts(blocks: Block[]): [Block, Block][] {
  const out: [Block, Block][] = [];
  const sorted = [...blocks].sort((a, b) =>
    a.day === b.day ? a.start - b.start : a.day.localeCompare(b.day));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].day !== sorted[i].day) break;
      if (sorted[j].start < sorted[i].end) out.push([sorted[i], sorted[j]]);
      else break;
    }
  }
  return out;
}
```

### 4.4 Unplaced load (the "what's left to schedule" counter)

For each `LoadItem`, compare `hoursPerWeek` with the sum of blocks that point to
it via `loadItemId`. Show "CPP118 · 4CPEB: 3 / 3 hrs placed" so you always know
what still needs a slot.

---

## 5. UI plan

Single page with three panels (or tabs on mobile):

1. **Profile and sign-off** – the header fields, semester/A.Y., effectivity date,
   endorser and approver (saved as defaults so next semester is one click).
2. **Faculty load** – a table where you type what the chair gave you
   (course, section, hours/week, regular or overload). Includes
   "Add admin function" presets: Research, Com. Extension, Consultation, Quasi,
   Administrative.
3. **Grid editor** – the Mon–Sat × 7:00 AM–8:00 PM grid.
   - Pick an item from the load list, then click or drag across slots to place it.
   - Drag block edges to resize; drag the block to move it.
   - Categories are colour-coded; conflicting blocks get a red outline.
   - Side panel: live summary box, "unplaced load" counters, validation messages.

**Grid implementation tip:** render a CSS grid of 26 rows × 6 columns and absolutely
position blocks by `(start − DAY_START) / SLOT`. Use Pointer Events (not the HTML5
drag API) so it also works on touch screens. Snap to 30 minutes.

**Quality-of-life features worth adding early**
- "Auto-add breaks" button (drops the 10:00–10:30 and 1:30–2:00 breaks on each class day, as on your current form).
- "Copy Monday to…" for repeated patterns.
- Undo/redo (Zustand middleware or a small history stack).
- Save/Load JSON, so you can keep one file per semester.

---

## 6. Validation rules

Keep these as **data**, not scattered `if` statements, so you can change them when
policy changes:

```ts
// lib/rules.ts
export const DEFAULT_REQUIRED_HOURS = {
  research: 3,
  extension: 3,
  consultation: 4,
  quasi: 6,
};
```

The defaults above are copied from your current form. **Confirm the actual
required hours and caps with your Program Chair / HR (HRMD) before relying on them.**
The app should not state university policy that you haven't verified.

Suggested checks (each returns `error` or `warning`):

| Rule | Severity |
|---|---|
| Two blocks overlap on the same day | error |
| Block outside 7:00 AM–8:00 PM | error |
| Teaching load not fully placed (hours placed < hours assigned) | error |
| Teaching blocks placed that exceed the assigned load | error |
| Required admin hours not met (research, extension, consultation, quasi) | warning |
| Regular teaching hours differ from the expected regular load | warning |
| A teaching block longer than N hours without a break | warning |
| No consultation hours on a day the faculty is on campus | warning |
| Totals on screen don't match the exported summary | test failure (automated) |

---

## 7. DOCX export

The original form has an awkward 20-column table, which is the result of manual
edits. Rebuild it cleanly: **1 time column + 6 day columns**, with vertical merges for
multi-hour blocks.

Approach:

1. Unzip the original `.docx` once and extract the header/footer images from
   `word/media/` into `public/form-assets/`.
2. Build the document with the `docx` package: letterhead header, title lines,
   the grid table, the summary table, and the sign-off section.
3. For each day, walk the 26 slots top to bottom. Where a block starts, emit a
   cell with `rowSpan = number of slots`. In the following rows covered by that
   span, **omit the cell** for that day (this is how `docx` expects merged rows).
4. Use `ShadingType.CLEAR` for cell shading, and set both `columnWidths` and
   per-cell `width` in DXA units so it renders correctly in Word and Google Docs.
5. Trigger the download with `Packer.toBlob()` and `file-saver`.

Skeleton:

```ts
// lib/export/docx.ts
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
         WidthType, VerticalAlign, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { SLOT_COUNT, slotLabel, slotStart } from "../time";
import { DAYS, Schedule } from "../types";

export async function exportDocx(s: Schedule) {
  const rows: TableRow[] = [headerRow()];
  const covered = new Set<string>(); // "MON-4" = cell already covered by a rowSpan

  for (let i = 0; i < SLOT_COUNT; i++) {
    const cells = [timeCell(slotLabel(i))];
    for (const day of DAYS) {
      if (covered.has(`${day}-${i}`)) continue; // merged from above
      const block = s.blocks.find(b => b.day === day && b.start === slotStart(i));
      if (!block) { cells.push(emptyCell()); continue; }
      const span = (block.end - block.start) / 30;
      for (let k = 1; k < span; k++) covered.add(`${day}-${i + k}`);
      cells.push(blockCell(block, span, s));
    }
    rows.push(new TableRow({ children: cells }));
  }

  const doc = new Document({ sections: [{ children: [/* letterhead, title, table, summary, signatures */] }] });
  saveAs(await Packer.toBlob(doc), `Declaration-of-Work_${s.profile.academicYear}.docx`);
}
```

Always set the page size and orientation explicitly. Check the original file's page
setup (size and margins) and match it, because `docx` defaults to A4.

After exporting during development, open the file in Word and LibreOffice to confirm
the merged cells line up.

**PDF:** add a `/print` route that renders the same data as HTML with
`@page { size: landscape; margin: 0.5in; }` and a "Print / Save as PDF" button.

---

## 8. Project structure

```
dow-builder/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                 # three-panel editor
│  └─ print/page.tsx           # print-friendly view
├─ components/
│  ├─ ProfileForm.tsx
│  ├─ SignatoryForm.tsx
│  ├─ LoadTable.tsx
│  ├─ AdminPresets.tsx
│  ├─ ScheduleGrid.tsx         # pointer-event grid
│  ├─ BlockChip.tsx
│  ├─ SummaryBox.tsx
│  └─ ValidationPanel.tsx
├─ lib/
│  ├─ types.ts
│  ├─ time.ts
│  ├─ hours.ts
│  ├─ conflicts.ts
│  ├─ rules.ts
│  ├─ store.ts                 # Zustand + persist
│  ├─ schema.ts                # Zod schemas for import/export JSON
│  └─ export/
│     ├─ docx.ts
│     └─ json.ts
├─ public/form-assets/         # letterhead/footer images from the original form
├─ tests/
│  ├─ hours.test.ts
│  ├─ conflicts.test.ts
│  └─ fixtures/cimacio-2026-1st.json   # your current schedule as a fixture
└─ README.md
```

---

## 9. Setup

```bash
npx create-next-app@latest dow-builder --typescript --tailwind --app --eslint
cd dow-builder
npm install zustand zod docx file-saver
npm install -D vitest @types/file-saver
npm run dev
```

Add to `package.json`:

```json
"scripts": { "test": "vitest" }
```

---

## 10. Roadmap

**Phase 1 – Core (a weekend)**
- Types, time helpers, hours and conflict logic, with unit tests
- Store with localStorage persistence
- Profile form and load table
- Static grid that displays blocks

**Phase 2 – Editing**
- Click/drag to place, resize, move, delete blocks
- Live summary box and unplaced-load counters
- Validation panel
- Auto-add breaks

**Phase 3 – Output**
- DOCX export matching the form, with the letterhead
- Print/PDF view
- Save/Load JSON; use your current schedule as the first fixture and compare the
  export against your original document

**Phase 4 – Nice to have**
- Semester templates ("copy last semester")
- Simple auto-scheduler (constraint solver that proposes slots for unplaced load)
- Accounts and a database (e.g. Supabase) so the Program Chair can see submitted
  schedules, view room/time clashes across faculty, and approve digitally
- Multi-faculty view for the chair

---

## 11. Open questions to settle before building

1. **Who are the users?** Just you, or other faculty in the College (and the chair)?
   That decides whether you need accounts.
2. **Policy rules.** What are the official required/maximum hours for each category
   for your position (Instructor 1)? Get these from the Program Chair or HRMD.
3. **Total hours.** Confirm that TOTAL excludes break time, as your current form implies.
4. **Form versions.** The header says "rev. 1 02122024". Will the form change? If so,
   keep the letterhead and layout in one config file.
5. **Page size.** Which paper does the office require (A4, Letter, long bond)?
6. **Signatures.** Printed and wet-signed, or is a digital signature acceptable?
7. **Data privacy.** If you ever store schedules on a server, treat names and
   schedules as personal data and follow the university's data-privacy policy.

---

## 12. Testing checklist

- [ ] Fixture totals match the form: 24 / 12 / 3 / 3 / 4 / 6 / N/A / 5 (total 52 without break)
- [ ] Overlapping blocks are detected on the same day only
- [ ] A 3-hour block exports as one merged cell spanning 6 rows
- [ ] Exported .docx opens in Word and LibreOffice with no repair prompt
- [ ] Time labels are correct for every slot (especially 12:00 PM)
- [ ] Import of a malformed JSON file fails gracefully (Zod error message)
- [ ] Reloading the page restores your work

---

## License

Your choice (MIT is a sensible default for a personal tool).
