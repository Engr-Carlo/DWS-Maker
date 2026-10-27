import { Packer } from "docx";
import { saveAs } from "file-saver";
import { buildDocument } from "./docx-build";
import { fileBaseName, type DwsState } from "./dws";

async function loadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function exportDocx(state: DwsState): Promise<void> {
  const [seal, tagline] = await Promise.all([loadImage("/form/seal.png"), loadImage("/form/tagline.png")]);
  const blob = await Packer.toBlob(buildDocument(state, { seal, tagline }));
  saveAs(blob, `${fileBaseName(state)}.docx`);
}
