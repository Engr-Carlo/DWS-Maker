"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  DAY_NAMES,
  SLOT_COUNT,
  buildGrid,
  fmtHours,
  formHours,
  formatLongDate,
  hoursByCategory,
  semesterLabel,
  slotLabel,
  totalHours,
  type DwsState,
} from "@/lib/dws";

const PAGE_WIDTH = 816;
const BORDER = "1px solid #000";

const cellBase: CSSProperties = { border: BORDER, padding: "0 3px", textAlign: "center", verticalAlign: "middle" };

function SignBlock({ heading, name, title }: { heading: string; name: string; title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11 }}>{heading}</div>
      <div style={{ marginTop: 14, textAlign: "center", fontWeight: 700, fontSize: 12, minHeight: 15 }}>{name}</div>
      <div style={{ textAlign: "center", fontSize: 10.5, minHeight: 13 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 11 }}>Date: _________________</div>
    </div>
  );
}

export function FormSheet({ state }: { state: DwsState }) {
  const { profile, signoff, subjects, cells, includeBreak } = state;
  const grid = useMemo(() => buildGrid(cells, subjects), [cells, subjects]);
  const byCategory = useMemo(() => hoursByCategory(cells, subjects), [cells, subjects]);
  const total = totalHours(byCategory, includeBreak);

  return (
    <div
      style={{
        width: PAGE_WIDTH,
        height: 1248,
        boxSizing: "border-box",
        padding: "38px 56px 24px 68px",
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 11,
        lineHeight: 1.25,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Image src="/form/seal.png" alt="" width={152} height={193} unoptimized loading="eager" style={{ width: 70, height: "auto" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11 }}>Republic of the Philippines</div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>Pamantasan ng Cabuyao</div>
          <div style={{ fontSize: 10 }}>(University of Cabuyao)</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>Administration and Finance Division</div>
          <div style={{ fontSize: 11 }}>Human Resource Management Department</div>
          <div style={{ fontSize: 9 }}>Katapatan Mutual Homes, Brgy. Banay-banay, City of Cabuyao, Laguna 4025</div>
        </div>
        <div style={{ width: 70, alignSelf: "flex-start", textAlign: "right", fontSize: 8, lineHeight: 1.3 }}>
          PNC:AF-FO-96
          <br />
          rev.1 02122024
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>DECLARATION OF WORK SCHEDULE</div>
        <div style={{ fontSize: 11 }}>
          {semesterLabel(profile.semester)}, A.Y. {profile.academicYear}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", rowGap: 3, columnGap: 12, marginTop: 10, fontSize: 11 }}>
        <div>
          <b>NAME:</b> {profile.name}
        </div>
        <div>
          <b>DEPT/OFFICE:</b> {profile.department}
        </div>
        <div>
          <b>POSITION TITLE:</b> {profile.position}
        </div>
        <div>
          <b>DESIGNATION:</b> {profile.designation}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 8 }}>
        <colgroup>
          <col style={{ width: 106 }} />
          {DAY_NAMES.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ height: 19 }}>
            <th style={{ ...cellBase, background: "#BFBFBF", fontSize: 9.5 }}>TIME</th>
            {DAY_NAMES.map((d) => (
              <th key={d} style={{ ...cellBase, background: "#BFBFBF", fontSize: 9.5 }}>
                {d.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SLOT_COUNT }, (_, slot) => (
            <tr key={slot} style={{ height: 22 }}>
              <td style={{ ...cellBase, fontSize: 8, whiteSpace: "nowrap" }}>{slotLabel(slot)}</td>
              {DAY_NAMES.map((day, d) => {
                const view = grid[slot][d];
                if (view && !view.start) return null;
                if (!view) return <td key={day} style={cellBase} />;
                const meta = CATEGORY_BY_ID[view.res.category];
                return (
                  <td
                    key={day}
                    rowSpan={view.length}
                    style={{ ...cellBase, background: meta.fill, color: meta.formInk, fontSize: 9, lineHeight: 1.2 }}
                  >
                    {view.length === 1 ? (
                      [view.res.title, view.res.subtitle].filter(Boolean).join(" ")
                    ) : (
                      <>
                        <div>{view.res.title}</div>
                        {view.res.subtitle && <div>{view.res.subtitle}</div>}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
        <div style={{ width: 245 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ ...cellBase, fontSize: 10, height: 19 }}>
                  SUMMARY
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c.id} style={{ height: 21 }}>
                  <td style={{ ...cellBase, textAlign: "left", background: c.fill, color: c.formInk, fontSize: 9.5, padding: "0 5px" }}>
                    {c.summaryLabel}
                  </td>
                  <td style={{ ...cellBase, width: 60, fontSize: 10 }}>{formHours(byCategory[c.id])}</td>
                </tr>
              ))}
              <tr style={{ height: 21 }}>
                <td style={{ ...cellBase, textAlign: "left", fontWeight: 700, fontSize: 10, padding: "0 5px" }}>TOTAL</td>
                <td style={{ ...cellBase, fontWeight: 700, fontSize: 10 }}>{fmtHours(total)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 3, fontSize: 8.5, fontStyle: "italic" }}>*put n/a if not applicable</div>
        </div>

        <div style={{ flex: 1 }}>
          <SignBlock heading="Endorsed by:" name={signoff.endorserName} title={signoff.endorserTitle} />
          <SignBlock heading="Approved by:" name={signoff.approverName} title={signoff.approverTitle} />
        </div>
      </div>

      <div style={{ marginTop: 18, width: 245 }}>
        <div style={{ height: 26 }} />
        <div style={{ borderTop: BORDER, textAlign: "center", fontWeight: 700, fontSize: 11, paddingTop: 2, minHeight: 16 }}>{profile.name}</div>
        <div style={{ textAlign: "center", fontSize: 9 }}>Signature over Printed Name</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11 }}>Effectivity Date: {formatLongDate(profile.effectivityDate)}</div>

      <Image
        src="/form/tagline.png"
        alt=""
        width={1200}
        height={288}
        unoptimized
        loading="eager"
        style={{ position: "absolute", bottom: 14, left: "50%", width: 150, height: "auto", transform: "translateX(-50%)" }}
      />
    </div>
  );
}

/** Shows the sheet on screen, scaled down to fit the available width. */
export function PreviewPane({ state }: { state: DwsState }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="h-[calc(100vh-3.5rem)] overflow-y-scroll bg-gray-100 px-6 py-8">
      <div className="mx-auto shadow-md ring-1 ring-gray-300" style={{ width: PAGE_WIDTH * scale, height: 1248 * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <FormSheet state={state} />
        </div>
      </div>
    </div>
  );
}
