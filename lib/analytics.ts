// Every number in reports is computed here from stored attempts. Nothing in this file calls AI.
import type { DB } from "./db";

export type Res = { id: string; t: string; c: boolean; g: string | null; e: string | null };
export type GAttempt = {
  id: string; testId: string; title: string; paper: string; type: string; startedAt: Date; submittedAt: Date;
  pct: number; results: Res[]; tabSwitches: number; durationSec: number; timeLimitMin: number;
};
export type Assigned = { id: string; type: string; paper: string; opensAt: Date; closesAt: Date };
export type Entry = { kind: "practice" | "video" | "note"; value: number | null; note: string | null; date: Date };
export type Weights = { w_recent: number; w_mastery: number; w_consistency: number; w_trend: number; low_readiness: number };
export type StudentData = { attempts: GAttempt[]; assigned: Assigned[]; entries: Entry[]; createdAt: Date };

export const DAY = 86400000;
const IST = 5.5 * 3600000;
const r1 = (n: number) => Math.round(n * 10) / 10;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export type Kind = "week" | "month" | "year";
/** Period boundaries in Indian time. Weeks start on Monday. */
export function range(kind: Kind, anchor: Date): { start: Date; end: Date } {
  const l = new Date(anchor.getTime() + IST); // "local" clock held in UTC fields
  let s: Date, e: Date;
  if (kind === "week") {
    const dow = (l.getUTCDay() + 6) % 7;
    s = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() - dow));
    e = new Date(s.getTime() + 7 * DAY);
  } else if (kind === "month") {
    s = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1));
    e = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth() + 1, 1));
  } else {
    s = new Date(Date.UTC(l.getUTCFullYear(), 0, 1));
    e = new Date(Date.UTC(l.getUTCFullYear() + 1, 0, 1));
  }
  return { start: new Date(s.getTime() - IST), end: new Date(e.getTime() - IST) };
}
export const prevRange = (kind: Kind, anchor: Date) => range(kind, new Date(range(kind, anchor).start.getTime() - 1));
export const inRange = (d: Date, r: { start: Date; end: Date }) => d >= r.start && d < r.end;

export type TopicRow = { topic: string; correct: number; total: number; pct: number };
export function topicTable(attempts: GAttempt[]): TopicRow[] {
  const m = new Map<string, { c: number; t: number }>();
  for (const a of attempts) for (const r of a.results) { const e = m.get(r.t) ?? { c: 0, t: 0 }; e.t++; if (r.c) e.c++; m.set(r.t, e); }
  return [...m].map(([topic, e]) => ({ topic, correct: e.c, total: e.t, pct: r1((e.c / e.t) * 100) })).sort((a, b) => a.pct - b.pct || a.topic.localeCompare(b.topic));
}
export type MistakeRow = { tag: string; explain: string; count: number; topics: string[] };
export function mistakeTable(attempts: GAttempt[]): MistakeRow[] {
  const m = new Map<string, MistakeRow>();
  for (const a of attempts) for (const r of a.results) {
    if (!r.g) continue;
    const x = m.get(r.g) ?? { tag: r.g, explain: r.e ?? "", count: 0, topics: [] };
    x.count++; if (!x.topics.includes(r.t)) x.topics.push(r.t);
    m.set(r.g, x);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export type Trend = "up" | "down" | "flat" | null;
export const trendOf = (cur: number | null, prev: number | null): Trend => (cur === null || prev === null ? null : cur - prev > 2 ? "up" : cur - prev < -2 ? "down" : "flat");
export const arrow = (t: Trend) => (t === "up" ? "▲" : t === "down" ? "▼" : t === "flat" ? "→" : "–");

export type Rollup = {
  kind: Kind; start: Date; end: Date; type: string | "all";
  taken: number; assigned: number; avgPct: number | null; prevAvgPct: number | null; trend: Trend;
  topics: TopicRow[]; mistakes: MistakeRow[]; best: TopicRow | null; weakest: TopicRow | null;
  practiceCount: number; videoPct: number | null; notes: { date: Date; note: string }[];
  attempts: { title: string; type: string; pct: number; date: Date }[];
};
export function rollup(d: StudentData, kind: Kind, anchor: Date, type: string = "all", now: Date = new Date()): Rollup {
  const R = range(kind, anchor), P = prevRange(kind, anchor);
  const typeOk = (t: string) => type === "all" || t === type;
  const cur = d.attempts.filter((a) => typeOk(a.type) && inRange(a.submittedAt, R));
  const prev = d.attempts.filter((a) => typeOk(a.type) && inRange(a.submittedAt, P));
  const doneIds = new Set(d.attempts.map((a) => a.testId));
  // A test counts as due once its window has closed (or the student has already taken it); open tests are not "missed".
  const dueTests = d.assigned.filter((t) => typeOk(t.type) && inRange(t.closesAt, R) && (t.closesAt <= now || doneIds.has(t.id)));
  const topics = topicTable(cur);
  const enough = topics.filter((t) => t.total >= 2);
  const pool = enough.length ? enough : topics;
  const entries = d.entries.filter((e) => inRange(e.date, R));
  const videos = entries.filter((e) => e.kind === "video" && e.value !== null).map((e) => e.value as number);
  return {
    kind, start: R.start, end: R.end, type,
    taken: dueTests.filter((t) => doneIds.has(t.id)).length, assigned: dueTests.length,
    avgPct: avg(cur.map((a) => a.pct)) === null ? null : r1(avg(cur.map((a) => a.pct))!),
    prevAvgPct: avg(prev.map((a) => a.pct)) === null ? null : r1(avg(prev.map((a) => a.pct))!),
    trend: trendOf(avg(cur.map((a) => a.pct)), avg(prev.map((a) => a.pct))),
    topics, mistakes: mistakeTable(cur).slice(0, 5),
    best: pool.length ? pool[pool.length - 1]! : null, weakest: pool.length ? pool[0]! : null,
    practiceCount: entries.filter((e) => e.kind === "practice").reduce((s, e) => s + (e.value ?? 0), 0),
    videoPct: videos.length ? Math.max(...videos) : null,
    notes: entries.filter((e) => e.kind === "note" && e.note).map((e) => ({ date: e.date, note: e.note! })),
    attempts: cur.map((a) => ({ title: a.title, type: a.type, pct: a.pct, date: a.submittedAt })).sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

export type ReadinessPart = { key: string; label: string; weight: number; value: number | null; note: string };
export type Readiness = { score: number | null; parts: ReadinessPart[] };
/** Missing components are left out and the remaining weights are rescaled, so a new student is not scored as zero. */
export function readiness(d: StudentData, bankTopics: string[], w: Weights, now: Date): Readiness {
  const at = [...d.attempts].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const last5 = at.slice(-5);
  const recent = last5.length ? avg(last5.map((a) => a.pct))! : null;
  const topics = topicTable(at);
  const mastered = topics.filter((t) => t.pct >= 70).length;
  const denom = bankTopics.length ? bankTopics.length : topics.length;
  const mastery = denom ? (mastered / denom) * 100 : null;
  const from = new Date(now.getTime() - 28 * DAY);
  const due = d.assigned.filter((t) => t.closesAt >= from && t.closesAt <= now);
  const done = new Set(d.attempts.map((a) => a.testId));
  const consistency = due.length ? (due.filter((t) => done.has(t.id)).length / due.length) * 100 : null;
  let trend: number | null = null;
  if (at.length >= 2) {
    const lastTwo = at.slice(-2).map((a) => a.pct), before = at.slice(-4, -2).map((a) => a.pct);
    const base = before.length ? avg(before)! : at[at.length - 2]!.pct;
    const cur = before.length ? avg(lastTwo)! : at[at.length - 1]!.pct;
    trend = Math.max(0, Math.min(100, 50 + (cur - base) * 2.5));
  }
  const parts: ReadinessPart[] = [
    { key: "recent", label: "Recent test average", weight: w.w_recent, value: recent, note: last5.length ? `Average of last ${last5.length} test(s)` : "No tests taken yet" },
    { key: "mastery", label: "Topic mastery", weight: w.w_mastery, value: mastery, note: denom ? `${mastered} of ${denom} topics at 70% or more` : "No topics tested yet" },
    { key: "consistency", label: "Consistency (last 4 weeks)", weight: w.w_consistency, value: consistency, note: due.length ? `${due.filter((t) => done.has(t.id)).length} of ${due.length} assigned tests completed` : "No tests were due in the last 4 weeks" },
    { key: "trend", label: "Score trend", weight: w.w_trend, value: trend, note: trend === null ? "Needs at least 2 tests" : "50 is flat; above means improving" },
  ];
  const usable = parts.filter((p) => p.value !== null && p.weight > 0);
  const tw = usable.reduce((s, p) => s + p.weight, 0);
  const score = usable.length && tw ? r1(usable.reduce((s, p) => s + (p.value as number) * p.weight, 0) / tw) : null;
  return { score, parts };
}

export type Flag = "inactive" | "falling" | "low";
export function lastActivity(d: StudentData): Date | null {
  const t = [...d.attempts.map((a) => a.submittedAt.getTime()), ...d.attempts.map((a) => a.startedAt.getTime()), ...d.entries.map((e) => e.date.getTime())];
  return t.length ? new Date(Math.max(...t)) : null;
}
export function flags(d: StudentData, ready: number | null, low: number, now: Date): Flag[] {
  const out: Flag[] = [];
  const la = lastActivity(d);
  if ((la ?? d.createdAt).getTime() < now.getTime() - 3 * DAY) out.push("inactive");
  const at = [...d.attempts].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()).slice(-3);
  if (at.length === 3 && at[1]!.pct < at[0]!.pct && at[2]!.pct < at[1]!.pct) out.push("falling");
  if (ready !== null && ready < low) out.push("low");
  return out;
}
export const FLAG_LABEL: Record<Flag, string> = { inactive: "No activity for 3+ days", falling: "Two falls in a row", low: "Low readiness" };

// ---- loading ----
const toRes = (v: unknown): Res[] => (Array.isArray(v) ? (v as Res[]) : []);

export async function loadBank(db: DB) {
  const rows = await db.query(`select distinct topic from questions where not archived`);
  return rows.map((r) => r.topic as string);
}
export async function loadWeights(db: DB): Promise<Weights & { mentor_email: string | null }> {
  const [s] = await db.query(`select * from settings where id=1`);
  return { w_recent: s.w_recent, w_mastery: s.w_mastery, w_consistency: s.w_consistency, w_trend: s.w_trend, low_readiness: s.low_readiness, mentor_email: s.mentor_email };
}
/** Loads data for the given students (or all students) in 4 queries. */
export async function loadStudents(db: DB, ids?: string[]) {
  const filt = ids ? `and u.id = any($1::uuid[])` : "";
  const args = ids ? [ids] : [];
  const users = await db.query(`select u.id, u.full_name, u.username, u.class_level, u.parent_name, u.parent_phone, u.batch_id, u.created_at, b.name as batch_name from users u left join batches b on b.id=u.batch_id where u.role='student' ${filt} order by u.full_name`, args);
  const sid = users.map((u) => u.id);
  const [att, asg, ent] = await Promise.all([
    db.query(`select a.id, a.test_id, a.student_id, a.started_at, a.submitted_at, a.score, a.max_score, a.results, a.tab_switches, t.title, t.paper, t.type, t.time_limit_min from attempts a join tests t on t.id=a.test_id where a.submitted_at is not null and a.student_id = any($1::uuid[])`, [sid]),
    db.query(`select s.student_id, t.id, t.type, t.paper, t.opens_at, t.closes_at from test_assignments s join tests t on t.id=s.test_id where s.student_id = any($1::uuid[])`, [sid]),
    db.query(`select student_id, kind, value, note, entry_date from manual_entries where student_id = any($1::uuid[])`, [sid]),
  ]);
  const out = new Map<string, StudentData & { user: (typeof users)[number] }>();
  for (const u of users) out.set(u.id, { user: u, attempts: [], assigned: [], entries: [], createdAt: new Date(u.created_at) });
  for (const a of att) out.get(a.student_id)?.attempts.push({
    id: a.id, testId: a.test_id, title: a.title, paper: a.paper, type: a.type, startedAt: new Date(a.started_at), submittedAt: new Date(a.submitted_at),
    pct: a.max_score ? r1((Math.max(0, a.score) / a.max_score) * 100) : 0, results: toRes(a.results), tabSwitches: a.tab_switches,
    durationSec: (new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000, timeLimitMin: a.time_limit_min,
  });
  for (const t of asg) out.get(t.student_id)?.assigned.push({ id: t.id, type: t.type, paper: t.paper, opensAt: new Date(t.opens_at), closesAt: new Date(t.closes_at) });
  for (const e of ent) out.get(e.student_id)?.entries.push({ kind: e.kind, value: e.value, note: e.note, date: new Date(e.entry_date) });
  return out;
}
