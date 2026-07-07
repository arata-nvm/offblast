// BULK_DIR=/path/to/xml npm run build:data
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseLawXml } from "../src/core/law-xml.ts";
import { detectFromSentences } from "../src/core/pipeline.ts";
import { resetLaws, saveLaw, writeIndex, lawUrl } from "./lib/store.ts";

const BULK_DIR = process.env.BULK_DIR;
if (!BULK_DIR) {
  console.error("BULK_DIRに展開済みXMLのディレクトリを指定してください。");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");

async function findXmls(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await findXmls(p)));
    else if (ent.name.toLowerCase().endsWith(".xml")) out.push(p);
  }
  return out;
}

type Version = { file: string; date: string };

// 1法令に現行版と未施行の将来版が混在するため、施行日が今日以前で最新の版を選ぶ。
// ファイル名は {法令ID}_{施行日YYYYMMDD}_{改正ID}.xml。
function pickCurrent(versions: Version[]): Version {
  const enforced = versions.filter((v) => v.date && v.date <= today);
  const pool = enforced.length ? enforced : versions;
  return pool.reduce((a, b) => (a.date >= b.date ? a : b));
}

async function main() {
  console.log(`▶ XML を走査中: ${BULK_DIR}`);
  const files = await findXmls(BULK_DIR!);

  const groups = new Map<string, Version[]>();
  for (const file of files) {
    const [id, date = ""] = path.basename(file, ".xml").split("_");
    (groups.get(id) ?? groups.set(id, []).get(id)!).push({ file, date });
  }
  console.log(`  ${files.length} XML / ${groups.size} 法令`);

  await resetLaws();
  const index: { id: string; name: string; count: number }[] = [];

  let i = 0;
  for (const [id, versions] of groups) {
    i++;
    try {
      const xml = await readFile(pickCurrent(versions).file, "utf8");
      const { title, sentences } = parseLawXml(xml);
      const haikus = await detectFromSentences(sentences);
      if (haikus.length > 0) {
        const name = title || id;
        await saveLaw({ id, name, url: lawUrl(id), haikus });
        index.push({ id, name, count: haikus.length });
      }
    } catch (e) {
      console.warn(`  ${id} … 失敗: ${(e as Error).message}`);
    }
    if (i % 500 === 0) console.log(`  … ${i}/${groups.size}`);
  }

  await writeIndex(index);
  const total = index.reduce((s, x) => s + x.count, 0);
  console.log(`✔ 完了: ${index.length} 法令 / 合計 ${total} 個の俳句`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
