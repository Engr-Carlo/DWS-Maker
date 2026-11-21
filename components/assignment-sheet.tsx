import Image from "next/image";
import type { CSSProperties } from "react";
import { TERMS, buildAssignment, dayCode, formatNumber, memoText, timeRange, usDate, type AssignmentModel } from "@/lib/assignment";
import type { DwsState, SubjectKind } from "@/lib/dws";

export const SHEET_WIDTH = 816;

const BODY_FONT = '"Century Gothic", "Avenir Next", "Segoe UI", Arial, sans-serif';
const GREEN = "#003300";
const LABEL = 96;
const VALUE = 144;

const th: CSSProperties = {
  border: "1px solid #000",
  background: "#D9D9D9",
  fontSize: 9.3,
  fontWeight: 700,
  textAlign: "center",
  padding: "3px 4px",
  verticalAlign: "middle",
};

const td: CSSProperties = {
  border: "1px solid #000",
  fontSize: 10.7,
  padding: "2px 4px",
  verticalAlign: "middle",
  height: 17,
  overflowWrap: "anywhere",
};

function Table({ widths, head, rows, centered = [], bold = [] }: { widths: number[]; head: string[]; rows: string[][]; centered?: number[]; bold?: number[] }) {
  return (
    <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: widths.reduce((a, b) => a + b, 0) / 15 }}>
      <colgroup>
        {widths.map((w, i) => (
          <col key={i} style={{ width: w / 15 }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} style={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((value, c) => (
              <td key={c} style={{ ...td, textAlign: centered.includes(c) ? "center" : "left", fontWeight: bold.includes(c) ? 700 : 400 }}>
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Row({ label, value, bold = true }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", minHeight: 18 }}>
      <div style={{ width: LABEL }}>{label}</div>
      <div style={{ width: VALUE - LABEL }}>:</div>
      <div style={{ fontWeight: bold ? 700 : 400 }}>{value}</div>
    </div>
  );
}

function Gap() {
  return <div style={{ height: 12 }} />;
}

export function AssignmentSheet({ state, kind, model }: { state: DwsState; kind: SubjectKind; model?: AssignmentModel }) {
  const data = model ?? buildAssignment(state, kind);
  const memo = memoText(state, data);
  const { assignment: a } = state;
  const classRows = data.rows.map((r) => [
    `${r.subject.code} ${r.subject.section}`.trim(),
    r.subject.title,
    r.dayLabel || dayCode(r.days),
    r.timeLabel || timeRange(r.startSlot, r.endSlot, true),
    r.subject.component === "lab" ? "Lab" : "Lec",
    r.room,
    formatNumber(r.units),
    usDate(r.subject.startDate || state.profile.effectivityDate),
  ]);
  const consultRows = data.consultations.map((c) => [c.day, c.time, a.consultRoom]);

  return (
    <div
      style={{
        width: SHEET_WIDTH,
        minHeight: 1248,
        boxSizing: "border-box",
        position: "relative",
        padding: `205px ${LABEL}px 70px`,
        background: "#fff",
        color: "#000",
        fontFamily: BODY_FONT,
        fontSize: 13.3,
        lineHeight: 1.25,
      }}
    >
      <div style={{ position: "absolute", top: 57, left: LABEL, right: LABEL }}>
        <div style={{ textAlign: "right", fontFamily: '"Arial Narrow", Arial, sans-serif', fontSize: 13.3 }}>PNC:AA-FO-11 rev. 1 09222023</div>
        <Image src="/form/seal.png" alt="" width={152} height={193} unoptimized loading="eager" style={{ position: "absolute", top: -4, left: 52, width: 94, height: "auto" }} />
        <div style={{ textAlign: "center", fontFamily: '"Times New Roman", Times, serif', marginTop: 2 }}>
          <div style={{ fontSize: 16, lineHeight: 1.15 }}>Republic of the Philippines</div>
          <div style={{ fontFamily: 'var(--font-blackletter), "Old English Text MT", serif', fontSize: 31, fontWeight: 700, color: GREEN, lineHeight: 1.05 }}>
            Pamantasan ng Cabuyao
          </div>
          <div style={{ fontSize: 17, fontFamily: '"Copperplate Gothic Light", "Times New Roman", serif', lineHeight: 1.15 }}>(University of Cabuyao)</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: '"Calibri Light", Calibri, sans-serif' }}>Academic Affairs Division</div>
          <div style={{ fontSize: 12 }}>Katapatan Mutual Homes, Brgy. Banay-banay, City of Cabuyao, Laguna 4025</div>
        </div>
      </div>

      <Row label="Date" value={memo.date} />
      <Gap />
      <Row label="To" value={memo.toName} />
      <div style={{ paddingLeft: VALUE }}>{memo.position}</div>
      <Gap />
      <Row label="From" value={memo.fromName} />
      <div style={{ paddingLeft: VALUE }}>{memo.fromTitle}</div>
      <Gap />
      <Row label="Subject" value={memo.subject} />
      <div style={{ paddingLeft: VALUE, fontWeight: 700 }}>
        [ {a.final ? "\u00A0" : "✔"} ] Tentative [ {a.final ? "✔" : "\u00A0"} ] Final
      </div>
      <div style={{ borderBottom: "4px double #000", marginTop: 4, marginBottom: 4 }} />
      <div style={{ marginBottom: 3 }}>{memo.intro}</div>
      <Table widths={[1450, 2325, 630, 1800, 630, 990, 540, 1260]} head={["Course/Subject Code/Section", "Descriptive Title", "Day", "Time", "Type", "Room", "Units", "Effectivity"]} rows={classRows.length ? classRows : [["", "", "", "", "", "", "", ""]]} centered={[2, 3, 4, 5, 6, 7]} bold={[0]} />
      <Gap />
      <div style={{ marginBottom: 3 }}>Below is the schedule of your Academic Consultation</div>
      <Table widths={[2274, 2274, 2659]} head={["Day", "Time", "Room"]} rows={consultRows.length ? consultRows : [["", "", ""]]} centered={[0, 1, 2]} />
      <Gap />
      <div style={{ marginBottom: 3 }}>Based on the above-mentioned teaching assignment, here is the total/average number of:</div>
      <Table widths={[2767, 3216, 3207]} head={["Total Teaching Hours", "Subject Preparation/s", "Total Number of Units"]} rows={[[memo.hoursLabel, memo.prepLabel.replace(/ {2,}/g, "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"), memo.unitsLabel]]} centered={[0, 1, 2]} />
      <Gap />
      <div>Please be reminded that you are bound by the following terms and condition:</div>
      <ol style={{ margin: 0, paddingLeft: 28, textAlign: "justify", listStyle: "decimal" }}>
        {TERMS.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ol>
      <Gap />
      <div>For your guidance and strict compliance.</div>
      <Gap />
      <div style={{ marginBottom: 3 }}>Faculty Profile:</div>
      <Table widths={[2977, 3750, 2634]} head={["Bachelor", "Masteral", "Doctorate"]} rows={[[a.bachelor, a.masteral, a.doctorate]]} />
      <Gap />
      <div style={{ display: "flex" }}>
        <div style={{ width: VALUE }}>ACTION TAKEN:</div>
        <div>Approved / Disapproved</div>
      </div>
      <Gap />
      <div style={{ paddingLeft: VALUE, fontWeight: 700 }}>{memo.vpName}</div>
      <div style={{ paddingLeft: VALUE }}>{memo.vpTitle}</div>
      <Gap />
      <div style={{ display: "flex" }}>
        <div style={{ width: VALUE }}>CONFORME:</div>
        <div style={{ fontWeight: 700 }}>{memo.conformeName}</div>
      </div>
      <div style={{ paddingLeft: VALUE }}>{memo.conformeRole}</div>
      <Gap />
      <div style={{ display: "flex" }}>
        <div style={{ width: 48 }}>cc:</div>
        <div>HRMD</div>
      </div>

      <Image src="/form/tagline.png" alt="" width={1200} height={288} unoptimized loading="eager" style={{ position: "absolute", bottom: 14, left: "50%", width: 175, height: "auto", transform: "translateX(-50%)" }} />
    </div>
  );
}
