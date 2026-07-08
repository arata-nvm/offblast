export type LawRecord = {
  id: string;
  name: string;
  url: string;
  haikus: string[];
};

const modules = import.meta.glob<LawRecord>("../data/laws/*.json", {
  eager: true,
  import: "default",
});
export const laws: LawRecord[] = Object.values(modules);

// BASE_URL の末尾スラッシュ有無は設定依存なので正規化し、二重/欠落スラッシュを防ぐ。
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const href = (p: string) => BASE + p.replace(/^\//, "");
