import { laws } from "../lib/data.ts";

// URLはIDから導出できるため、[id, 法令名, 俳句リスト] の配列で重複なく配信する
export function GET() {
  return new Response(
    JSON.stringify(laws.map((l) => [l.id, l.name, l.haikus])),
    { headers: { "Content-Type": "application/json" } },
  );
}
