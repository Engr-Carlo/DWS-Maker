import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LevelFormat,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  TextWrappingType,
  VerticalAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  type ParagraphChild,
} from "docx";
import {
  TERMS,
  buildAssignment,
  dayCode,
  formatNumber,
  memoText,
  timeRange,
  usDate,
  type AssignmentModel,
} from "./assignment";
import type { DocxImages } from "./docx-build";
import type { DwsState, SubjectKind } from "./dws";

const BODY = "Century Gothic";
const TEXT_SIZE = 20;
const CELL_SIZE = 16;
const HEAD_SIZE = 14;
const LABEL_STOP = 1440;
const VALUE_STOP = 2160;

const LINE = { style: BorderStyle.SINGLE, size: 4, color: "auto" };
const GRID_BORDERS = {
  top: LINE,
  bottom: LINE,
  left: LINE,
  right: LINE,
  insideHorizontal: LINE,
  insideVertical: LINE,
};

const dxa = (size: number) => ({ size, type: WidthType.DXA });

interface RunOpts {
  bold?: boolean;
  size?: number;
  font?: string;
  color?: string;
}

const run = (text: string, o: RunOpts = {}) =>
  new TextRun({ text, font: o.font ?? BODY, size: o.size ?? TEXT_SIZE, bold: o.bold, color: o.color });

interface ParaOpts {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  indent?: number;
  firstLine?: number;
  before?: number;
  after?: number;
  keepNext?: boolean;
  stops?: number[];
}

const line = (children: ParagraphChild[], o: ParaOpts = {}) =>
  new Paragraph({
    alignment: o.align ?? AlignmentType.LEFT,
    indent: o.indent || o.firstLine ? { left: o.indent ?? 0, firstLine: o.firstLine } : undefined,
    spacing: { before: o.before ?? 0, after: o.after ?? 0 },
    keepNext: o.keepNext,
    run: { font: BODY, size: TEXT_SIZE },
    tabStops: (o.stops ?? [LABEL_STOP, VALUE_STOP]).map((position) => ({ type: TabStopType.LEFT, position })),
    children,
  });

const text = (value: string, o: ParaOpts & RunOpts = {}) => line([run(value, o)], o);
const blank = () =>
  new Paragraph({ spacing: { before: 0, after: 0 }, run: { font: BODY, size: 16 }, children: [] });

/** The double rule that separates the memo heading from the body. */
const rule = () =>
  new Paragraph({
    spacing: { before: 0, after: 60 },
    run: { font: BODY, size: 8 },
    border: { bottom: { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 12, space: 1, color: "auto" } },
    children: [],
  });

/** "Label<tab>:<tab>Value" – the memo header layout. */
const field = (label: string, value: string, bold = true) =>
  line([run(label), run("\t:\t"), run(value, { bold })]);

function cell(value: string, width: number, o: { head?: boolean; align?: "left" | "center"; bold?: boolean } = {}) {
  return new TableCell({
    width: dxa(width),
    verticalAlign: VerticalAlign.CENTER,
    shading: o.head ? { type: ShadingType.CLEAR, color: "auto", fill: "D9D9D9" } : undefined,
    children: [
      new Paragraph({
        alignment: o.head || o.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [run(value, { bold: o.head || o.bold, size: o.head ? HEAD_SIZE : CELL_SIZE, font: BODY })],
      }),
    ],
  });
}

function gridTable(widths: number[], head: string[], body: string[][], centered: number[] = [], boldCols: number[] = []) {
  return new Table({
    width: dxa(widths.reduce((a, b) => a + b, 0)),
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: GRID_BORDERS,
    rows: [
      new TableRow({ height: { value: 319, rule: HeightRule.ATLEAST }, tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { head: true })) }),
      ...body.map(
        (row) =>
          new TableRow({
            height: { value: 227, rule: HeightRule.ATLEAST },
            cantSplit: true,
            children: row.map((v, i) => cell(v, widths[i], { align: centered.includes(i) ? "center" : "left", bold: boldCols.includes(i) })),
          }),
      ),
    ],
  });
}

function buildHeader(images: DocxImages) {
  const green = "003300";
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            type: "png",
            data: images.seal,
            transformation: { width: 94, height: 119 },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, offset: 565150 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -266065 },
              wrap: { type: TextWrappingType.NONE },
            },
          }),
          new TextRun({ text: "PNC:AA-FO-11 rev. 1 09222023", font: "Arial Narrow", size: 20 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, line: 192 },
        children: [
          new TextRun({ text: "Republic of the Philippines", font: "Times New Roman", size: 24 }),
          new TextRun({ text: "", break: 1, size: 16 }),
          new TextRun({ text: "Pamantasan ng Cabuyao", font: "Old English Text MT", size: 40, bold: true, color: green }),
          new TextRun({ text: "", break: 1, size: 28 }),
          new TextRun({ text: "(University of Cabuyao)", font: "Copperplate Gothic Light", size: 28 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Academic Affairs Division", font: "Calibri Light", size: 24, bold: true, italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Katapatan Mutual Homes, Brgy. Banay-banay, City of Cabuyao, Laguna 4025", font: "Times New Roman", size: 18 })],
      }),
      new Paragraph({ children: [] }),
    ],
  });
}

function buildFooter(images: DocxImages) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: "png", data: images.tagline, transformation: { width: 175, height: 42 } })],
      }),
    ],
  });
}

function classTable(state: DwsState, model: AssignmentModel) {
  const widths = [1450, 2325, 630, 1800, 630, 990, 540, 1260];
  const body = model.rows.map((r) => [
    `${r.subject.code} ${r.subject.section}`.trim(),
    r.subject.title,
    dayCode(r.days),
    timeRange(r.startSlot, r.endSlot, true),
    r.subject.component === "lab" ? "Lab" : "Lec",
    r.room,
    formatNumber(r.units),
    usDate(r.subject.startDate || state.profile.effectivityDate),
  ]);
  if (body.length === 0) body.push(["", "", "", "", "", "", "", ""]);
  return gridTable(widths, ["Course/Subject Code/Section", "Descriptive Title", "Day", "Time", "Type", "Room", "Units", "Effectivity"], body, [2, 3, 4, 5, 6, 7], [0]);
}

export function buildAssignmentDocument(state: DwsState, kind: SubjectKind, images: DocxImages): Document {
  const model = buildAssignment(state, kind);
  const memo = memoText(state, model);
  const { assignment: a } = state;

  const consult = gridTable(
    [2274, 2274, 2659],
    ["Day", "Time", "Room"],
    (model.consultations.length ? model.consultations : [{ day: "", time: "" }]).map((c) => [c.day, c.time, c.day ? a.consultRoom : ""]),
    [0, 1, 2],
  );

  const totals = gridTable(
    [2767, 3216, 3207],
    ["Total Teaching Hours", "Subject Preparation/s", "Total Number of Units"],
    [[memo.hoursLabel, memo.prepLabel, memo.unitsLabel]],
    [0, 1, 2],
  );

  const profile = gridTable([2977, 3750, 2634], ["Bachelor", "Masteral", "Doctorate"], [[a.bachelor, a.masteral, a.doctorate]]);

  const children: (Paragraph | Table)[] = [
    field("Date", memo.date),
    blank(),
    field("To", memo.toName),
    text(memo.position, { indent: VALUE_STOP }),
    blank(),
    field("From", memo.fromName),
    text(memo.fromTitle, { indent: VALUE_STOP }),
    blank(),
    line([run("Subject"), run("\t:\t"), run(memo.subject, { bold: true })]),
    line(
      [
        run("[ ", { bold: true }),
        run(a.final ? " " : "✔", { bold: true, font: "Segoe UI Symbol" }),
        run(" ] Tentative [ ", { bold: true }),
        run(a.final ? "✔" : " ", { bold: true, font: "Segoe UI Symbol" }),
        run(" ] Final", { bold: true }),
      ],
      { indent: VALUE_STOP },
    ),
    rule(),
    text(memo.intro, { after: 40 }),
    classTable(state, model),
    blank(),
    text("Below is the schedule of your Academic Consultation", { keepNext: true, after: 40 }),
    consult,
    blank(),
    text("Based on the above-mentioned teaching assignment, here is the total/average number of:", { keepNext: true, after: 40 }),
    totals,
    blank(),
    text("Please be reminded that you are bound by the following terms and condition:"),
    ...TERMS.map(
      (term) =>
        new Paragraph({
          numbering: { reference: "terms", level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 0 },
          children: [run(term)],
        }),
    ),
    blank(),
    text("For your guidance and strict compliance."),
    blank(),
    text("Faculty Profile:", { keepNext: true, after: 40 }),
    profile,
    blank(),
    line([run("ACTION TAKEN:"), run("\t"), run("Approved / Disapproved")], { keepNext: true, stops: [VALUE_STOP] }),
    blank(),
    text(memo.vpName, { indent: VALUE_STOP, bold: true, keepNext: true }),
    text(memo.vpTitle, { indent: VALUE_STOP }),
    blank(),
    line([run("CONFORME:"), run("\t"), run(memo.conformeName, { bold: true })], { keepNext: true, stops: [VALUE_STOP] }),
    text(memo.conformeRole, { indent: VALUE_STOP }),
    blank(),
    line([run("cc:"), run("\t"), run("HRMD")], { stops: [720] }),
  ];

  return new Document({
    creator: "DWS Maker",
    title: `Teaching Assignment (${kind === "regular" ? "Regular" : "Overload"} Load)`,
    styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
    numbering: {
      config: [
        {
          reference: "terms",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 426, hanging: 284 } }, run: { font: BODY, size: TEXT_SIZE } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 18720 },
            margin: { top: 1843, right: 1440, bottom: 720, left: 1440, header: 851, footer: 720 },
          },
        },
        headers: { default: buildHeader(images) },
        footers: { default: buildFooter(images) },
        children,
      },
    ],
  });
}
