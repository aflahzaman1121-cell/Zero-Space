import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { parseInput } from "@/lib/import";

export async function POST(req: Request) {
  if (!(await apiUser("mentor"))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.text !== "string" || !["csv", "json"].includes(b.format)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const p = parseInput(b.text, b.format);
  if (p.fatal) return NextResponse.json({ error: p.fatal }, { status: 400 });
  const bad = p.rows.filter((r) => !r.ok);
  if (bad.length) return NextResponse.json({ error: `Row ${bad[0]!.row}: ${bad[0]!.errors.join("; ")}` }, { status: 400 });
  const db = await getDB();
  await db.tx(async (t) => {
    for (const { q } of p.rows) await t.query(
      `insert into questions (paper, chapter, topic, difficulty, text, options, correct, solution, wrong) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb)`,
      [q!.paper, q!.chapter, q!.topic, q!.difficulty, q!.text, JSON.stringify(q!.options), q!.correct, q!.solution, JSON.stringify(q!.wrong)],
    );
  });
  return NextResponse.json({ imported: p.rows.length });
}
