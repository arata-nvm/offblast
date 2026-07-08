// BULK_DIR=/path/to/xml npm run build:data
import { readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { parseLawXml } from "../src/core/law-xml.ts";
import { detectFromSentences } from "../src/core/pipeline.ts";
import { resetLaws, saveLaw, writeIndex, lawUrl } from "./lib/store.ts";

const BULK_DIR = process.env.BULK_DIR;
if (!BULK_DIR) {
  console.error("BULK_DIRに展開済みXMLのディレクトリを指定してください。");
  process.exit(1);
}

const WORKERS = Number(
  process.env.WORKERS ?? os.availableParallelism?.() ?? os.cpus().length,
);
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

type Result = {
  type: "ready" | "done" | "result";
  id?: string;
  name?: string;
  haikus?: string[];
};

async function main() {
  console.log(`▶ XML を走査中: ${BULK_DIR}`);
  const files = await findXmls(BULK_DIR!);

  const groups = new Map<string, Version[]>();
  for (const file of files) {
    const [id, date = ""] = path.basename(file, ".xml").split("_");
    (groups.get(id) ?? groups.set(id, []).get(id)!).push({ file, date });
  }
  const tasks = [...groups].map(([id, versions]) => ({
    id,
    file: pickCurrent(versions).file,
  }));

  await resetLaws();
  const index: { id: string; name: string; count: number }[] = [];
  const total = tasks.length;
  let done = 0;

  const collect = async (id: string, name: string, haikus: string[]) => {
    if (haikus.length > 0) {
      await saveLaw({ id, name, url: lawUrl(id), haikus });
      index.push({ id, name, count: haikus.length });
    }
    if (++done % 1000 === 0) console.log(`  … ${done}/${total}`);
  };

  console.log(`  ${files.length} XML / ${total} 法令`);
  if (WORKERS <= 1) {
    for (const t of tasks) {
      try {
        const { title, sentences } = parseLawXml(
          await readFile(t.file, "utf8"),
        );
        await collect(
          t.id,
          title || t.id,
          await detectFromSentences(sentences),
        );
      } catch (e) {
        console.warn(`  ${t.id} … 失敗: ${(e as Error).message}`);
      }
    }
  } else {
    let next = 0;
    const workerUrl = new URL("./worker.ts", import.meta.url);
    await new Promise<void>((resolve) => {
      let alive = Math.min(WORKERS, total || 1);
      for (let i = 0; i < alive; i++) {
        const w = new Worker(workerUrl, { execArgv: ["--import", "tsx"] });
        const feed = () =>
          w.postMessage(next < tasks.length ? tasks[next++] : null);
        w.on("message", async (m: Result) => {
          if (m.type === "ready") return feed();
          if (m.type === "done") {
            await w.terminate();
            if (--alive === 0) resolve();
            return;
          }
          await collect(m.id!, m.name!, m.haikus!);
          feed();
        });
      }
    });
  }

  await writeIndex(index);
  const totalHaikus = index.reduce((s, x) => s + x.count, 0);
  console.log(`✔ 完了: ${index.length} 法令 / 合計 ${totalHaikus} 個の俳句`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
