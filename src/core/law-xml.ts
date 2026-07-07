import { XMLParser } from "fast-xml-parser";

// preserveOrder で構造を配列のまま保持し、Sentence 配下の全テキストを拾えるようにする。
const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: true,
  trimValues: true,
});

type PONode = Record<string, unknown>;

function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object") {
    const o = node as PONode;
    if ("#text" in o) return String(o["#text"]);
    let s = "";
    for (const k of Object.keys(o)) if (k !== ":@") s += textOf(o[k]);
    return s;
  }
  return "";
}

function walk(node: unknown, tag: string, out: string[]): void {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, tag, out);
    return;
  }
  if (node && typeof node === "object") {
    const o = node as PONode;
    for (const key of Object.keys(o)) {
      if (key === ":@" || key === "#text") continue;
      if (key === tag) out.push(textOf(o[key]));
      else walk(o[key], tag, out);
    }
  }
}

export function parseLawXml(xml: string): {
  title: string;
  sentences: string[];
} {
  const tree = parser.parse(xml);
  const titles: string[] = [];
  walk(tree, "LawTitle", titles);
  const sentences: string[] = [];
  walk(tree, "Sentence", sentences);
  return { title: titles[0] ?? "", sentences };
}
