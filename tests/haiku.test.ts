import { describe, it, expect } from "vitest";
import { findHaikus, moraCount, type Token } from "../src/core/haiku.ts";
import { parseLawXml } from "../src/core/law-xml.ts";
import { cleanBody, detectFromSentences } from "../src/core/pipeline.ts";

const tok = (p: Partial<Token> & { surface: string; pron: string }): Token => ({
  pos: "名詞",
  posDetail1: "*",
  basicForm: p.surface,
  conjugatedForm: "*",
  isUnknown: false,
  ...p,
});

describe("moraCount", () => {
  it("拗音（小書き仮名）は数えない", () => {
    expect(moraCount(tok({ surface: "自由", pron: "ジユー" }))).toBe(3);
    expect(moraCount(tok({ surface: "保障", pron: "ホショー" }))).toBe(3);
  });
  it("長音ー・促音ッ・撥音ンは1として数える", () => {
    expect(moraCount(tok({ surface: "コーヒー", pron: "コーヒー" }))).toBe(4);
    expect(moraCount(tok({ surface: "学校", pron: "ガッコー" }))).toBe(4);
  });
  it("記号・未知語は0", () => {
    expect(moraCount(tok({ surface: "、", pron: "、", pos: "記号" }))).toBe(0);
    expect(moraCount(tok({ surface: "𠮷", pron: "*", isUnknown: true }))).toBe(
      0,
    );
  });
});

describe("findHaikus（純ロジック・ゴールデン）", () => {
  const constitution: Token[] = [
    tok({ surface: "学問", pron: "ガクモン", posDetail1: "サ変接続" }),
    tok({
      surface: "の",
      pron: "ノ",
      pos: "助詞",
      posDetail1: "連体化",
      basicForm: "の",
    }),
    tok({ surface: "自由", pron: "ジユー", posDetail1: "形容動詞語幹" }),
    tok({
      surface: "は",
      pron: "ワ",
      pos: "助詞",
      posDetail1: "係助詞",
      basicForm: "は",
    }),
    tok({
      surface: "これ",
      pron: "コレ",
      posDetail1: "代名詞",
      basicForm: "これ",
    }),
    tok({
      surface: "を",
      pron: "ヲ",
      pos: "助詞",
      posDetail1: "格助詞",
      basicForm: "を",
    }),
    tok({ surface: "保障", pron: "ホショー", posDetail1: "サ変接続" }),
    tok({
      surface: "する",
      pron: "スル",
      pos: "動詞",
      posDetail1: "自立",
      basicForm: "する",
    }),
  ];

  it("有名な一句を検出する", () => {
    expect(findHaikus(constitution)).toEqual(["学問の 自由はこれを 保障する"]);
  });

  it("助詞始まりは句の先頭にできない", () => {
    const t = [
      tok({ surface: "の", pron: "ノ", pos: "助詞", posDetail1: "連体化" }),
      ...constitution,
    ];
    expect(findHaikus(t)).toEqual(["学問の 自由はこれを 保障する"]);
  });
});

describe("clean と XML パイプライン", () => {
  it("割注（…）と非句点文を除去する", () => {
    expect(
      cleanBody(["学問の自由は（例外を除く）これを保障する。", "断片"]),
    ).toBe("学問の自由はこれを保障する。");
  });

  it("法令XMLの Sentence から俳句を検出できる", async () => {
    const xml =
      "<Law><LawBody><LawTitle>日本国憲法</LawTitle><MainProvision><Article><Paragraph><ParagraphSentence>" +
      "<Sentence>学問の自由は、これを保障する。</Sentence>" +
      "</ParagraphSentence></Paragraph></Article></MainProvision></LawBody></Law>";
    const { title, sentences } = parseLawXml(xml);
    expect(title).toBe("日本国憲法");
    expect(await detectFromSentences(sentences)).toContain(
      "学問の 自由は、これを 保障する",
    );
  });
});

describe("誤検出フィルタ（活用途中・接頭詞で終わる句を除外）", () => {
  // 活用語の途中や接頭詞で切れる句を含む文。
  const bad = [
    "その債権に後れる旨の合意がされる。", // 「合意がさ」= 未然形で切れる
    "封筒を投票箱に入れなければならない。", // 「入れなけれ」= 仮定形で切れる
    "その届出の追完をすることができる。", // 「届出の追」= 接頭詞で切れる
  ];

  it("活用途中で終わる句は検出しない", async () => {
    for (const s of bad) {
      const haikus = await detectFromSentences([s]);
      for (const h of haikus) {
        expect(
          h.endsWith("さ") || h.endsWith("なけれ") || h.endsWith("追"),
        ).toBe(false);
      }
    }
  });
});
