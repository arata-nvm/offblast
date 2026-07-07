import kuromoji from "kuromoji";
import path from "node:path";
import { createRequire } from "node:module";
import type { Token } from "./haiku.ts";

const require = createRequire(import.meta.url);
const DIC_PATH = path.join(
  path.dirname(require.resolve("kuromoji")),
  "..",
  "dict",
);

// 辞書ロードが重いのでトークナイザは一度だけ生成して使い回す。
let tokenizerPromise: Promise<
  kuromoji.Tokenizer<kuromoji.IpadicFeatures>
> | null = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: DIC_PATH }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();
  return tokenizer.tokenize(text).map((w) => ({
    surface: w.surface_form,
    pos: w.pos,
    posDetail1: w.pos_detail_1,
    basicForm: w.basic_form,
    pron: w.pronunciation,
    isUnknown: w.word_type === "UNKNOWN",
  }));
}
