import { parentPort } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import { parseLawXml } from "../src/core/law-xml.ts";
import { detectFromSentences } from "../src/core/pipeline.ts";

type Task = { id: string; file: string } | null;

parentPort!.on("message", async (task: Task) => {
  if (task === null) {
    parentPort!.postMessage({ type: "done" });
    return;
  }
  try {
    const { title, sentences } = parseLawXml(await readFile(task.file, "utf8"));
    const haikus = await detectFromSentences(sentences);
    parentPort!.postMessage({
      type: "result",
      id: task.id,
      name: title || task.id,
      haikus,
    });
  } catch (e) {
    parentPort!.postMessage({
      type: "result",
      id: task.id,
      name: task.id,
      haikus: [],
      error: String(e),
    });
  }
});

parentPort!.postMessage({ type: "ready" });
