export type LawIndexEntry = { id: string; name: string; count: number };
export type LawRecord = {
  id: string;
  name: string;
  url: string;
  haikus: string[];
};

import indexJson from "../data/index.json";
export const lawIndex = indexJson as LawIndexEntry[];

const modules = import.meta.glob<LawRecord>("../data/laws/*.json", {
  eager: true,
  import: "default",
});
export const laws: LawRecord[] = Object.values(modules);

export function getLaw(id: string): LawRecord | undefined {
  return laws.find((l) => l.id === id);
}

// BASE_URL の末尾スラッシュ有無は設定依存なので正規化し、二重/欠落スラッシュを防ぐ。
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const href = (p: string) => BASE + p.replace(/^\//, "");
