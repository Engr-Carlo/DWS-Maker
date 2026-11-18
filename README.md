# DWS Maker

A small, free tool for making the **Declaration of Work Schedule** (form PNC:AF-FO-96, Pamantasan ng Cabuyao).
Fill in your details, add your subjects, paint your week on a Mon–Sat grid, and download the finished form as a
Word (.docx) file or print it on long bond paper (8.5 × 13 in).

There is no account and no server-side storage. Everything stays in your browser and is saved automatically.

## How to use it

1. **Your details** – name, position, department, semester, academic year and effectivity date.
2. **Subjects** – add each subject and section with its hours per week, then pick one.
3. Click or drag across the grid to place it. Click a placed slot again, or use the eraser, to clear it.
4. **Other activities** – research, extension, consultation, quasi, administrative and breaks work the same way.
5. **Sign-off** – endorser and approver names and titles.
6. Check the **Form preview** tab, then **Download DWS** or **Print**.

### Teaching assignment letters

The **Teaching assignment** and **Teaching assignment preview** tabs fill in the two memos (form PNC:AA-FO-11) straight from your schedule:

- **Teaching assignment** – edit each class’s title, room, type, dates and memo details.
- **Teaching assignment preview** – review the generated regular and overload memo layout without compressing the editing form.
- **Regular load** – every subject marked *Regular* (normally 24 hours).
- **Overload** – every subject marked *Overload*.

Days, times, hours and the consultation schedule come from the grid. You only add each class's descriptive title, room,
Lec/Lab type and effectivity date, plus the memo details (dean, VP, degrees). Lecture units equal contact hours; one lab
unit equals 3 hours. Download each letter as a `.docx`, download both at once, or print them.

Handy details:

- Each subject shows how many of its hours are placed, and warns when you go over.
- Totals follow the form: breaks are not counted unless you tick **Count breaks**, and categories with no hours print `N/A`.
- `Ctrl+Z` / `Ctrl+Y` undo and redo placements.
- **File → Save backup file** exports your schedule as a `.dws.json` file you can reopen later or on another computer.
- **File → Load example** fills in a sample schedule.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Other scripts: `npm run build`, `npm run lint`.

## Deploy

It is a static Next.js app with no backend or database. Import the repository on [Vercel](https://vercel.com/new) and
deploy with the default settings.

## Project layout

| Path | What it does |
|---|---|
| `components/dws-app.tsx` | Page layout, undo/redo, file menu, downloads |
| `components/schedule-grid.tsx` | The click-and-drag weekly grid |
| `components/sidebar.tsx` | Details, subjects, activities and sign-off forms |
| `components/form-sheet.tsx` | On-screen DWS form preview and print layout |
| `components/assignment-panel.tsx` | Teaching assignment forms and separate preview panel |
| `components/assignment-sheet.tsx` | On-screen and print layout of the teaching assignment memo |
| `lib/dws.ts` | Types, hour calculations, example data, saving and loading |
| `lib/assignment.ts` | Turns the schedule grid into class rows, consultation rows and totals |
| `lib/docx-build.ts` | Builds the DWS Word document that matches the official form |
| `lib/assignment-docx.ts` | Builds the teaching assignment Word documents |
| `public/form/` | University seal and tagline used on the form |

## Notes

The letterhead, colours and layout follow the 2026 v2 form. If the university revises the form, update
`lib/docx-build.ts` and `components/form-sheet.tsx` together so the preview, print and Word file stay identical.
