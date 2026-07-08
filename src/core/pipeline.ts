import { tokenize } from "./tokenize.ts";
import { findHaikus } from "./haiku.ts";

const PAREN = /（[^（）]*）/g;

// 句点で終わる文だけを対象にし、割注（…）と鉤括弧を落とすことで、条文本文だけから俳句を拾う。
function cleanBody(sentences: string[]): string {
  let buf = "";
  for (const raw of sentences) {
    if (!raw.endsWith("。")) continue;
    buf += raw.replaceAll("「", "").replaceAll("」", "").replace(PAREN, "");
  }
  return buf;
}

export async function detectFromSentences(
  sentences: string[],
): Promise<string[]> {
  const body = cleanBody(sentences);
  if (!body) return [];
  return findHaikus(await tokenize(body));
}

export { cleanBody };
