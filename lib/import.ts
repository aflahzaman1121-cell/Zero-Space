// Question import: CSV or JSON in, validated rows out. Used by the browser preview and again by the server before saving.
import type { Misconception } from "./grading";

export const CSV_COLUMNS = ["paper", "chapter", "topic", "difficulty", "question", "option_a", "option_b", "option_c", "option_d", "correct", "solution", "tag_a", "why_a", "tag_b", "why_b", "tag_c", "why_c", "tag_d", "why_d"] as const;

export type CleanQuestion = {
  paper: string; chapter: string; topic: string; difficulty: "easy" | "medium" | "hard"; text: string; options: string[]; correct: number; solution: string; wrong: Record<string, Misconception>;
};
export type RowResult = { row: number; ok: boolean; errors: string[]; q?: CleanQuestion };

export function parseCSV(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], f = "", q = false;
  const s = input.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { cur.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; cur.push(f); f = ""; if (cur.some((x) => x.trim() !== "")) rows.push(cur); cur = []; }
    else f += c;
  }
  cur.push(f); if (cur.some((x) => x.trim() !== "")) rows.push(cur);
  if (!rows.length) return [];
  const head = rows[0]!.map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function csvTemplate(): string {
  const sample = ["MA", "Cost accounting techniques", "Break-even analysis", "medium", "Fixed costs are ₹40,000 and contribution is ₹20 a unit. What is the break-even point in units?", "800", "1,333", "2,000", "20", "C", "Break-even units = fixed costs ÷ contribution per unit = 40,000 ÷ 20 = 2,000.", "Divided by selling price instead of contribution", "40,000 ÷ 50 uses the wrong divisor.", "Divided by variable cost instead of contribution", "40,000 ÷ 30 uses the wrong divisor.", "", "", "Stopped at the contribution per unit", "20 is the contribution; the break-even point needs fixed costs divided by it."];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return CSV_COLUMNS.join(",") + "\n" + sample.map(esc).join(",") + "\n";
}

const L = ["a", "b", "c", "d"];
/** Accepts the flat CSV shape, or JSON objects that use an options array and a wrong map. */
export function normalizeRow(raw: any): Record<string, string> {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw ?? {})) r[k.toLowerCase()] = v == null ? "" : String(v).trim();
  r.question = r.question || r.text || "";
  if (Array.isArray(raw?.options)) raw.options.slice(0, 4).forEach((o: unknown, i: number) => (r[`option_${L[i]}`] = String(o ?? "").trim()));
  if (raw?.wrong && typeof raw.wrong === "object") {
    for (const [k, v] of Object.entries(raw.wrong as Record<string, any>)) {
      const i = /^\d$/.test(k) ? Number(k) : L.indexOf(k.toLowerCase());
      if (i >= 0 && i < 4 && v) { r[`tag_${L[i]}`] = String(v.tag ?? "").trim(); r[`why_${L[i]}`] = String(v.explain ?? v.why ?? "").trim(); }
    }
  }
  return r;
}

export function validateRow(raw: any, row: number): RowResult {
  const r = normalizeRow(raw);
  const errors: string[] = [];
  for (const f of ["paper", "chapter", "topic", "question", "solution"]) if (!r[f]) errors.push(`Missing ${f}`);
  const opts = L.map((l) => r[`option_${l}`] ?? "");
  opts.forEach((o, i) => { if (!o) errors.push(`Missing option ${L[i]!.toUpperCase()}`); });
  if (new Set(opts.filter(Boolean).map((o) => o.toLowerCase())).size < opts.filter(Boolean).length) errors.push("Two options are identical");
  let correct = -1;
  const c = (r.correct ?? "").trim().toLowerCase();
  if (/^[a-d]$/.test(c)) correct = L.indexOf(c); else if (/^[0-3]$/.test(c)) correct = Number(c); else if (/^[1-4]$/.test(c) && raw?.options) correct = Number(c) - 1;
  if (correct < 0) errors.push("Correct answer must be A, B, C or D");
  const diff = (r.difficulty || "medium").toLowerCase();
  if (!["easy", "medium", "hard"].includes(diff)) errors.push("Difficulty must be easy, medium or hard");
  const wrong: Record<string, Misconception> = {};
  L.forEach((l, i) => {
    if (i === correct) return;
    const tag = r[`tag_${l}`] ?? "", why = r[`why_${l}`] ?? "";
    if (!tag) errors.push(`Option ${l.toUpperCase()} is wrong, so it needs a misconception tag`);
    else wrong[String(i)] = { tag, explain: why };
  });
  if (errors.length) return { row, ok: false, errors };
  return { row, ok: true, errors: [], q: { paper: r.paper!.toUpperCase(), chapter: r.chapter!, topic: r.topic!, difficulty: diff as any, text: r.question!, options: opts, correct, solution: r.solution!, wrong } };
}

export function parseInput(text: string, format: "csv" | "json"): { rows: RowResult[]; fatal?: string } {
  const t = text.trim();
  if (!t) return { rows: [], fatal: "Nothing to import." };
  try {
    let raws: unknown[];
    if (format === "json") {
      const j = JSON.parse(t);
      raws = Array.isArray(j) ? j : Array.isArray(j?.questions) ? j.questions : [];
      if (!raws.length) return { rows: [], fatal: "JSON must be a list of questions, or an object with a questions list." };
    } else {
      raws = parseCSV(t);
      if (!raws.length) return { rows: [], fatal: "No data rows found. Is the header row present?" };
    }
    if (raws.length > 500) return { rows: [], fatal: "Import at most 500 questions at a time." };
    return { rows: raws.map((r, i) => validateRow(r, i + 1)) };
  } catch (e) {
    return { rows: [], fatal: format === "json" ? `That is not valid JSON: ${(e as Error).message}` : `Could not read the CSV: ${(e as Error).message}` };
  }
}
