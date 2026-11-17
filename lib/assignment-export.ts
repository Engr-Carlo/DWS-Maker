import { Packer } from "docx";
import { saveAs } from "file-saver";
import { buildAssignmentDocument } from "./assignment-docx";
import { assignmentFileName } from "./assignment";
import type { DwsState, SubjectKind } from "./dws";

async function loadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function exportAssignments(state: DwsState, kinds: SubjectKind[]): Promise<void> {
  const [seal, tagline] = await Promise.all([loadImage("/form/seal.png"), loadImage("/form/tagline.png")]);
  for (const [index, kind] of kinds.entries()) {
    const blob = await Packer.toBlob(buildAssignmentDocument(state, kind, { seal, tagline }));
    saveAs(blob, assignmentFileName(state, kind));
    if (index < kinds.length - 1) await new Promise((resolve) => setTimeout(resolve, 600));
  }
}
