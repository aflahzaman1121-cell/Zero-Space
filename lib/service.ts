// Test-taking logic. All privileged steps run on the server; the browser never sees correct answers during a test.
import type { DB } from "./db";
import { grade, groupMistakes, seededShuffle, type Question } from "./grading";
import { notifyMentor } from "./notify";

export type Order = { q: string; o: number[] }[];

export const TAB_SWITCH_FLAG = 5;
export const FAST_FINISH_FRACTION = 0.25;

export async function loadQuestions(db: DB, ids: string[]) {
  if (!ids.length) return new Map<string, Question>();
  const rows = await db.query(
    `select id, topic, chapter, text, options, correct, solution, wrong from questions where id = any($1::uuid[])`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id as string, r as unknown as Question]));
}

export async function startAttempt(db: DB, studentId: string, testId: string, now = new Date()) {
  const [asg] = await db.query(`select 1 from test_assignments where test_id=$1 and student_id=$2`, [testId, studentId]);
  if (!asg) throw new Error("This test isn't assigned to you.");
  const [existing] = await db.query(`select id from attempts where test_id=$1 and student_id=$2`, [testId, studentId]);
  if (existing) return { attemptId: existing.id as string };
  const [t] = await db.query(`select * from tests where id=$1`, [testId]);
  if (!t) throw new Error("Test not found.");
  if (now < new Date(t.opens_at)) throw new Error("This test hasn't opened yet.");
  if (now >= new Date(t.closes_at)) throw new Error("This test has closed.");
  const tq = await db.query(`select question_id from test_questions where test_id=$1`, [testId]);
  if (!tq.length) throw new Error("This test has no questions yet.");
  const order: Order = seededShuffle(tq.map((r) => r.question_id as string)).map((q) => ({ q, o: seededShuffle([0, 1, 2, 3]) }));
  const deadline = new Date(Math.min(now.getTime() + t.time_limit_min * 60000, new Date(t.closes_at).getTime()));
  const [ins] = await db.query(
    `insert into attempts (test_id, student_id, started_at, deadline, question_order) values ($1,$2,$3,$4,$5::jsonb)
     on conflict (test_id, student_id) do update set test_id = excluded.test_id returning id`,
    [testId, studentId, now.toISOString(), deadline.toISOString(), JSON.stringify(order)],
  );
  return { attemptId: ins.id as string };
}

async function ownAttempt(db: DB, id: string, studentId: string) {
  const [a] = await db.query(
    `select a.*, t.title, t.time_limit_min, t.marks, t.negative, t.paper, t.type from attempts a join tests t on t.id=a.test_id where a.id=$1 and a.student_id=$2`,
    [id, studentId],
  );
  if (!a) throw new Error("Attempt not found.");
  return a;
}

/** Submit an attempt exactly once. Safe to call repeatedly or concurrently. */
export async function finalizeAttempt(db: DB, attemptId: string, auto: boolean, now = new Date()) {
  const [a] = await db.query(
    `select a.*, t.title, t.time_limit_min, t.marks, t.negative, t.paper from attempts a join tests t on t.id=a.test_id where a.id=$1`,
    [attemptId],
  );
  if (!a || a.submitted_at) return;
  const order = a.question_order as Order;
  const qids = order.map((x) => x.q);
  const qmap = await loadQuestions(db, qids);
  const g = grade(qids, a.answers ?? {}, qmap, Number(a.marks), Number(a.negative));
  const deadline = new Date(a.deadline);
  const submittedAt = auto && deadline < now ? deadline : now;
  const upd = await db.query(
    `update attempts set submitted_at=$2, auto_submitted=$3, score=$4, max_score=$5, results=$6::jsonb where id=$1 and submitted_at is null returning id`,
    [attemptId, submittedAt.toISOString(), auto, g.score, g.max, JSON.stringify(g.results.map((r) => ({ id: r.qid, t: r.topic, c: r.correct, g: r.misconception?.tag ?? null, e: r.misconception?.explain ?? null })))],
  );
  if (!upd.length) return;

  const mistakes = groupMistakes(g.results);
  const [prev] = await db.query(
    `select a2.score, a2.max_score from attempts a2 join tests t2 on t2.id=a2.test_id
     where a2.student_id=$1 and t2.paper=$2 and a2.submitted_at is not null and a2.submitted_at < $3 and a2.id <> $4
     order by a2.submitted_at desc limit 1`,
    [a.student_id, a.paper, submittedAt.toISOString(), attemptId],
  );
  const prevPct = prev && prev.max_score ? Math.round((Math.max(0, prev.score) / prev.max_score) * 1000) / 10 : null;
  const durationSec = Math.max(0, (submittedAt.getTime() - new Date(a.started_at).getTime()) / 1000);
  const flags: string[] = [];
  if (a.tab_switches >= TAB_SWITCH_FLAG) flags.push(`${a.tab_switches} tab switches`);
  if (!auto && durationSec < a.time_limit_min * 60 * FAST_FINISH_FRACTION && g.results.length >= 5) flags.push("Finished unusually fast");
  const weak = g.topics.filter((t) => t.pct < 70).slice(0, 2).map((t) => t.topic);
  const delta = prevPct === null ? null : Math.round((g.pct - prevPct) * 10) / 10;
  const summary =
    `${g.pct}% (${g.correctCount}/${g.results.length}).` +
    (delta === null ? " First test in this paper." : ` ${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta)} points from the last ${a.paper} test.`) +
    (weak.length ? ` Weak: ${weak.join(", ")}.` : "") +
    (mistakes[0] ? ` Top mistake: ${mistakes[0].tag}${mistakes[0].count > 1 ? ` (x${mistakes[0].count})` : ""}.` : "") +
    (flags.length ? ` Flags: ${flags.join("; ")}.` : "");
  await db.query(
    `insert into attempt_reports (attempt_id, student_id, test_id, summary, data) values ($1,$2,$3,$4,$5::jsonb)`,
    [attemptId, a.student_id, a.test_id, summary, JSON.stringify({ pct: g.pct, prevPct, delta, topics: g.topics, mistakes, tabSwitches: a.tab_switches, durationSec, auto, flags })],
  );
  const [stu] = await db.query(`select full_name from users where id=$1`, [a.student_id]);
  await notifyMentor(db, summary, stu?.full_name ?? "A student", a.title);
}

/** Auto-submit this student's attempts whose deadline has passed. */
export async function sweepExpired(db: DB, studentId: string, now = new Date()) {
  const rows = await db.query(`select id from attempts where student_id=$1 and submitted_at is null and deadline < $2`, [studentId, now.toISOString()]);
  for (const r of rows) await finalizeAttempt(db, r.id, true, now);
}

export async function getAttemptForTake(db: DB, attemptId: string, studentId: string, now = new Date()) {
  let a = await ownAttempt(db, attemptId, studentId);
  if (!a.submitted_at && new Date(a.deadline) <= now) {
    await finalizeAttempt(db, a.id, true, now);
    a = await ownAttempt(db, attemptId, studentId);
  }
  if (a.submitted_at) return { submitted: true as const, title: a.title as string };
  const order = a.question_order as Order;
  const qmap = await loadQuestions(db, order.map((x) => x.q));
  return {
    submitted: false as const,
    title: a.title as string,
    deadline: new Date(a.deadline).toISOString(),
    serverNow: now.toISOString(),
    marks: Number(a.marks),
    negative: Number(a.negative),
    answers: (a.answers ?? {}) as Record<string, number>,
    questions: order.map(({ q, o }) => {
      const qq = qmap.get(q)!;
      return { id: q, text: qq.text, topic: qq.topic, options: o.map((i) => ({ i, text: qq.options[i] ?? "" })) };
    }),
  };
}

export async function saveProgress(
  db: DB, studentId: string,
  d: { attemptId: string; answers: Record<string, number>; timeDelta: Record<string, number>; blurs: number },
  now = new Date(),
) {
  const a = await ownAttempt(db, d.attemptId, studentId);
  if (a.submitted_at) return { submitted: true };
  if (new Date(a.deadline) <= now) { await finalizeAttempt(db, a.id, true, now); return { submitted: true }; }
  const valid = new Set((a.question_order as Order).map((x) => x.q));
  const answers: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.answers)) if (valid.has(k) && Number.isInteger(v) && v >= 0 && v < 4) answers[k] = v;
  const tp: Record<string, number> = { ...(a.time_per_question ?? {}) };
  for (const [k, v] of Object.entries(d.timeDelta)) if (valid.has(k)) tp[k] = (tp[k] ?? 0) + Math.max(0, Math.min(Number(v) || 0, 600000));
  await db.query(
    `update attempts set answers=$2::jsonb, time_per_question=$3::jsonb, tab_switches = tab_switches + $4 where id=$1 and submitted_at is null`,
    [a.id, JSON.stringify(answers), JSON.stringify(tp), Math.max(0, Math.min(Math.floor(d.blurs) || 0, 50))],
  );
  return { submitted: false };
}

export async function submitAttempt(db: DB, studentId: string, attemptId: string, now = new Date()) {
  await ownAttempt(db, attemptId, studentId);
  await finalizeAttempt(db, attemptId, false, now);
  return { ok: true };
}

export async function getResult(db: DB, attemptId: string, studentId: string | null) {
  const [a] = studentId
    ? await db.query(`select a.*, t.title, t.marks, t.negative, t.time_limit_min from attempts a join tests t on t.id=a.test_id where a.id=$1 and a.student_id=$2`, [attemptId, studentId])
    : await db.query(`select a.*, t.title, t.marks, t.negative, t.time_limit_min from attempts a join tests t on t.id=a.test_id where a.id=$1`, [attemptId]);
  if (!a) throw new Error("Result not found.");
  if (!a.submitted_at) throw new Error("This test hasn't been submitted yet.");
  const order = a.question_order as Order;
  const qids = order.map((x) => x.q);
  const qmap = await loadQuestions(db, qids);
  const answers = (a.answers ?? {}) as Record<string, number>;
  const g = grade(qids, answers, qmap, Number(a.marks), Number(a.negative));
  return {
    title: a.title as string,
    submittedAt: new Date(a.submitted_at).toISOString(),
    autoSubmitted: !!a.auto_submitted,
    durationSec: Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000),
    tabSwitches: a.tab_switches as number,
    score: g.score, max: g.max, pct: g.pct, correctCount: g.correctCount, total: g.results.length,
    topics: g.topics,
    mistakes: groupMistakes(g.results),
    review: order.map(({ q, o }, idx) => {
      const qq = qmap.get(q)!;
      const r = g.results.find((x) => x.qid === q)!;
      return {
        n: idx + 1, id: q, text: qq.text, topic: qq.topic, solution: qq.solution,
        options: o.map((i) => ({ i, text: qq.options[i] ?? "" })),
        correct: qq.correct, chosen: r.chosen, isCorrect: r.correct, misconception: r.misconception,
      };
    }),
  };
}
