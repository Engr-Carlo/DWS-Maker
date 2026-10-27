import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  DAY_NAMES,
  SLOT_COUNT,
  buildGrid,
  formHours,
  formatLongDate,
  hoursByCategory,
  fmtHours,
  semesterLabel,
  slotLabel,
  totalHours,
  type DwsState,
} from "./dws";

export interface DocxImages {
  seal: Uint8Array;
  tagline: Uint8Array;
}

const FONT = "Arial";
const CONTENT_WIDTH = 9990;
const TIME_COL = 1500;
const DAY_COL = 1415;

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const allLines = { top: LINE, bottom: LINE, left: LINE, right: LINE };
const tableNoBorders = { ...noBorders, insideHorizontal: NONE, insideVertical: NONE };

const dxa = (size: number) => ({ size, type: WidthType.DXA });

interface RunOptions {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
}

function run(text: string, o: RunOptions = {}) {
  return new TextRun({ text, font: FONT, size: o.size ?? 18, bold: o.bold, italics: o.italics, color: o.color });
}

interface ParaOptions extends RunOptions {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  before?: number;
  after?: number;
}

function para(text: string, o: ParaOptions = {}) {
  return new Paragraph({
    alignment: o.align ?? AlignmentType.LEFT,
    spacing: { before: o.before ?? 0, after: o.after ?? 0 },
    children: [run(text, o)],
  });
}

function labelled(label: string, value: string, width: number) {
  return new TableCell({
    width: dxa(width),
    borders: noBorders,
    children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [run(`${label} `, { bold: true, size: 19 }), run(value, { size: 19 })] })],
  });
}

function buildHeader(images: DocxImages) {
  const textCell = new TableCell({
    width: dxa(6600),
    borders: noBorders,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      para("Republic of the Philippines", { align: AlignmentType.CENTER, size: 20 }),
      para("Pamantasan ng Cabuyao", { align: AlignmentType.CENTER, size: 32, bold: true }),
      para("(University of Cabuyao)", { align: AlignmentType.CENTER, size: 18 }),
      para("Administration and Finance Division", { align: AlignmentType.CENTER, size: 20, bold: true }),
      para("Human Resource Management Department", { align: AlignmentType.CENTER, size: 20 }),
      para("Katapatan Mutual Homes, Brgy. Banay-banay, City of Cabuyao, Laguna 4025", { align: AlignmentType.CENTER, size: 16 }),
    ],
  });

  return new Header({
    children: [
      new Table({
        width: dxa(CONTENT_WIDTH),
        columnWidths: [1700, 6600, 1690],
        borders: tableNoBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: dxa(1700),
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [new ImageRun({ type: "png", data: images.seal, transformation: { width: 72, height: 91 } })],
                  }),
                ],
              }),
              textCell,
              new TableCell({
                width: dxa(1690),
                borders: noBorders,
                children: [
                  para("PNC:AF-FO-96", { align: AlignmentType.RIGHT, size: 14 }),
                  para("rev.1 02122024", { align: AlignmentType.RIGHT, size: 14 }),
                ],
              }),
            ],
          }),
        ],
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
        children: [new ImageRun({ type: "png", data: images.tagline, transformation: { width: 150, height: 36 } })],
      }),
    ],
  });
}

function buildScheduleTable(state: DwsState) {
  const grid = buildGrid(state.cells, state.subjects);
  const headerCell = (text: string, width: number) =>
    new TableCell({
      width: dxa(width),
      borders: allLines,
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "BFBFBF" },
      verticalAlign: VerticalAlign.CENTER,
      children: [para(text, { align: AlignmentType.CENTER, bold: true, size: 17 })],
    });

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [headerCell("TIME", TIME_COL), ...DAY_NAMES.map((d) => headerCell(d.toUpperCase(), DAY_COL))],
    }),
  ];

  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const cells: TableCell[] = [
      new TableCell({
        width: dxa(TIME_COL),
        borders: allLines,
        verticalAlign: VerticalAlign.CENTER,
        children: [para(slotLabel(slot), { align: AlignmentType.CENTER, size: 14 })],
      }),
    ];

    for (let day = 0; day < DAY_NAMES.length; day++) {
      const view = grid[slot][day];
      if (view && !view.start) continue;

      if (view) {
        const meta = CATEGORY_BY_ID[view.res.category];
        const color = meta.formInk.replace("#", "");
        const lines = view.length === 1 ? [[view.res.title, view.res.subtitle].filter(Boolean).join(" ")] : [view.res.title, view.res.subtitle].filter(Boolean);
        cells.push(
          new TableCell({
            width: dxa(DAY_COL),
            rowSpan: view.length,
            borders: allLines,
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: meta.fill.replace("#", "") },
            children: lines.map((line) => para(line, { align: AlignmentType.CENTER, size: 16, color })),
          }),
        );
      } else {
        cells.push(new TableCell({ width: dxa(DAY_COL), borders: allLines, children: [new Paragraph({ children: [] })] }));
      }
    }

    rows.push(new TableRow({ height: { value: 290, rule: HeightRule.ATLEAST }, children: cells }));
  }

  return new Table({
    width: dxa(CONTENT_WIDTH),
    columnWidths: [TIME_COL, ...DAY_NAMES.map(() => DAY_COL)],
    rows,
  });
}

function buildSummaryTable(state: DwsState) {
  const byCategory = hoursByCategory(state.cells, state.subjects);
  const total = totalHours(byCategory, state.includeBreak);
  const LABEL = 2300;
  const VALUE = 1000;

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          width: dxa(LABEL + VALUE),
          columnSpan: 2,
          borders: allLines,
          children: [para("SUMMARY", { bold: true, size: 17, align: AlignmentType.CENTER })],
        }),
      ],
    }),
    ...CATEGORIES.map(
      (c) =>
        new TableRow({
          height: { value: 270, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: dxa(LABEL),
              borders: allLines,
              verticalAlign: VerticalAlign.CENTER,
              shading: { type: ShadingType.CLEAR, color: "auto", fill: c.fill.replace("#", "") },
              children: [para(c.summaryLabel, { size: 16, color: c.formInk.replace("#", "") })],
            }),
            new TableCell({
              width: dxa(VALUE),
              borders: allLines,
              verticalAlign: VerticalAlign.CENTER,
              children: [para(formHours(byCategory[c.id]), { size: 16, align: AlignmentType.CENTER })],
            }),
          ],
        }),
    ),
    new TableRow({
      height: { value: 270, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({ width: dxa(LABEL), borders: allLines, children: [para("TOTAL", { bold: true, size: 17 })] }),
        new TableCell({
          width: dxa(VALUE),
          borders: allLines,
          children: [para(fmtHours(total), { bold: true, size: 17, align: AlignmentType.CENTER })],
        }),
      ],
    }),
  ];

  return new Table({ width: dxa(LABEL + VALUE), columnWidths: [LABEL, VALUE], rows });
}

function signBlock(heading: string, name: string, title: string) {
  return [
    para(heading, { size: 17, before: 60 }),
    para(name || " ", { bold: true, size: 18, align: AlignmentType.CENTER, before: 300 }),
    para(title || " ", { size: 16, align: AlignmentType.CENTER }),
    para("Date: _________________", { size: 17, before: 80 }),
  ];
}

export function buildDocument(state: DwsState, images: DocxImages): Document {
  const { profile, signoff } = state;
  const effectivity = formatLongDate(profile.effectivityDate);

  const fields = new Table({
    width: dxa(CONTENT_WIDTH),
    columnWidths: [5800, 4190],
    borders: tableNoBorders,
    rows: [
      new TableRow({ children: [labelled("NAME:", profile.name, 5800), labelled("DEPT/OFFICE:", profile.department, 4190)] }),
      new TableRow({ children: [labelled("POSITION TITLE:", profile.position, 5800), labelled("DESIGNATION:", profile.designation, 4190)] }),
    ],
  });

  const lower = new Table({
    width: dxa(CONTENT_WIDTH),
    columnWidths: [4300, 5690],
    borders: tableNoBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: dxa(4300),
            borders: noBorders,
            children: [buildSummaryTable(state), para("*put n/a if not applicable", { italics: true, size: 15, before: 40 })],
          }),
          new TableCell({
            width: dxa(5690),
            borders: noBorders,
            children: [
              ...signBlock("Endorsed by:", signoff.endorserName, signoff.endorserTitle),
              ...signBlock("Approved by:", signoff.approverName, signoff.approverTitle),
            ],
          }),
        ],
      }),
    ],
  });

  const signature = new Table({
    width: dxa(CONTENT_WIDTH),
    columnWidths: [4300, 5690],
    borders: tableNoBorders,
    rows: [
      new TableRow({
        height: { value: 700, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({ width: dxa(4300), borders: noBorders, children: [new Paragraph({ children: [] })] }),
          new TableCell({ width: dxa(5690), borders: noBorders, children: [new Paragraph({ children: [] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: dxa(4300),
            borders: { ...noBorders, top: LINE },
            children: [
              para(profile.name || " ", { bold: true, align: AlignmentType.CENTER, size: 18 }),
              para("Signature over Printed Name", { align: AlignmentType.CENTER, size: 15 }),
            ],
          }),
          new TableCell({ width: dxa(5690), borders: noBorders, children: [new Paragraph({ children: [] })] }),
        ],
      }),
    ],
  });

  return new Document({
    creator: "DWS Maker",
    title: "Declaration of Work Schedule",
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12242, height: 18722 },
            margin: { top: 500, right: 992, bottom: 500, left: 1260, header: 300, footer: 200 },
          },
        },
        headers: { default: buildHeader(images) },
        footers: { default: buildFooter(images) },
        children: [
          para("DECLARATION OF WORK SCHEDULE", { bold: true, size: 28, align: AlignmentType.CENTER, before: 60 }),
          para(`${semesterLabel(profile.semester)}, A.Y. ${profile.academicYear}`, { size: 20, align: AlignmentType.CENTER, after: 120 }),
          fields,
          new Paragraph({ spacing: { after: 60 }, children: [] }),
          buildScheduleTable(state),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          lower,
          signature,
          para(`Effectivity Date:  ${effectivity}`, { size: 18, before: 160 }),
        ],
      },
    ],
  });
}
