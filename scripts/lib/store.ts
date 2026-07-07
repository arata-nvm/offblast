import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const LAWS_DIR = path.join(DATA_DIR, "laws");

export type LawRecord = {
  id: string;
  name: string;
  url: string;
  haikus: string[];
};

export const lawUrl = (id: string) => `https://laws.e-gov.go.jp/law/${id}`;

export async function resetLaws() {
  await rm(LAWS_DIR, { recursive: true, force: true });
  await mkdir(LAWS_DIR, { recursive: true });
}

export async function saveLaw(rec: LawRecord) {
  await writeFile(path.join(LAWS_DIR, `${rec.id}.json`), JSON.stringify(rec));
}

export async function writeIndex(
  entries: { id: string; name: string; count: number }[],
) {
  entries.sort((a, b) => b.count - a.count);
  await writeFile(
    path.join(DATA_DIR, "index.json"),
    JSON.stringify(entries, null, 2),
  );
}
