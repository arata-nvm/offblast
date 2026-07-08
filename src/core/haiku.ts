export interface Token {
  surface: string;
  pos: string;
  posDetail1: string;
  basicForm: string;
  conjugatedForm: string;
  pron: string;
  isUnknown: boolean;
}

// 小書き仮名は前の音に含まれ独立した拍にならないので除く。
// 促音ッ・長音ー・撥音ンは1拍として数えるため、あえて残す。
const SMALL_KANA = /[ァィゥェォャュョ]/g;

export function moraCount(t: Token): number {
  if (t.isUnknown) return 0;
  if (t.pos === "記号") return 0;
  if (!t.pron || t.pron === "*") return 0;
  return [...t.pron.replace(SMALL_KANA, "")].length;
}

// 助詞始まり・体言止めでない中途半端な切れ方・記号や英字の混入などを弾く。
function canBeFirstWord(t: Token): boolean {
  const notParticle =
    t.pos !== "助詞" && t.pos !== "助動詞" && t.pos !== "記号";
  const notSuffix = t.posDetail1 !== "接尾" && t.posDetail1 !== "非自立";
  const notSuru =
    t.posDetail1 !== "自立" ||
    (t.basicForm !== "する" && t.basicForm !== "できる");
  return notParticle && notSuffix && notSuru;
}

function canBePart(t: Token): boolean {
  const notUnknown = !t.isUnknown;
  const notBadSymbol = ![..."（）「」。…"].some((c) => t.surface.includes(c));
  const notAlpha = t.posDetail1 !== "アルファベット";
  const notDaiNum = !(t.basicForm === "第" && t.posDetail1 === "数接続");
  return notUnknown && notBadSymbol && notAlpha && notDaiNum;
}

function canBeLastWord(t: Token): boolean {
  const notRentaishi = t.pos !== "連体詞";
  const notConnective =
    !/(名詞接続|格助詞|係助詞|連体化|接続助詞|並立助詞|副詞化|数接続)/.test(
      t.posDetail1,
    );
  const notDa = !(t.pos === "助動詞" && t.basicForm === "だ");
  const notNumber = !(t.pos === "名詞" && t.posDetail1 === "数");
  // 助詞で終わると句が途切れる。また未然/連用/仮定形は活用語の途中で切れている
  // （さ・し・なかっ・なけれ 等）ので、下五にはできない。
  const notParticle = t.pos !== "助詞";
  const notStem = !(
    (t.pos === "動詞" || t.pos === "助動詞") &&
    /^(未然|連用|仮定|体言接続|ガル接続)/.test(t.conjugatedForm)
  );
  return (
    notRentaishi &&
    notConnective &&
    notDa &&
    notNumber &&
    notParticle &&
    notStem
  );
}

const PART_LENGTHS = [5, 7, 5] as const;

export function findHaikus(tokens: Token[]): string[] {
  const found: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    let parts = "";
    let partIndex = 0;
    let sum = 0;

    for (let j = i; j < tokens.length; j++) {
      const t = tokens[j];
      if (sum === 0 && !canBeFirstWord(t)) break;
      if (!canBePart(t)) break;

      parts += t.surface;
      sum += moraCount(t);

      if (sum > PART_LENGTHS[partIndex]) break;
      if (sum === PART_LENGTHS[partIndex]) {
        if (t.pos === "接頭詞") break; // 接頭詞で句を終えると次語と分断される（例: 追|完）
        partIndex++;
        if (partIndex === PART_LENGTHS.length) {
          if (!canBeLastWord(t)) break;
          found.push(parts);
          break;
        }
        parts += " ";
        sum = 0;
      }
    }
  }

  return [...new Set(found)];
}
