import bcrypt from "bcryptjs";
import type { DB } from "./db";
import { DEMO_QUESTIONS } from "./demo-data";
import { finalizeAttempt, type Order } from "./service";

export const DEMO_MENTOR = { username: "demo.mentor", password: "ZeroMentor#2026" };
export const DEMO_STUDENT_PASSWORD = "ZeroStudent#2026";

const day = 86400000;

export async function demoExists(db: DB) {
  const [r] = await db.query(`select count(*)::int as n from users where is_demo`);
  return r.n > 0;
}

/** Loads clearly-marked demo data. Everything it creates has is_demo = true and is removed by deleteDemo. */
export async function seedDemo(db: DB, now = new Date()) {
  if (await demoExists(db)) return { skipped: true };
  const mentorHash = await bcrypt.hash(DEMO_MENTOR.password, 10);
  const studentHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 10);
  const [batch] = await db.query(`insert into batches (name, is_demo) values ('Demo batch (MA)', true) returning id`);
  await db.query(
    `insert into users (username, password_hash, role, full_name, must_change_password, is_demo) values ($1,$2,'mentor','Demo Mentor',false,true)`,
    [DEMO_MENTOR.username, mentorHash],
  );
  const students: Record<string, string> = {};
  for (const [u, name, cls] of [["demo.aanya", "Aanya Demo", 11], ["demo.rohan", "Rohan Demo", 12], ["demo.kabir", "Kabir Demo", 11]] as const) {
    const [r] = await db.query(
      `insert into users (username, password_hash, role, full_name, class_level, parent_name, parent_phone, batch_id, must_change_password, is_demo)
       values ($1,$2,'student',$3,$4,$5,'0000000000',$6,false,true) returning id`,
      [u, studentHash, name, cls, `Parent of ${name.split(" ")[0]}`, batch.id],
    );
    students[u] = r.id;
  }
  const qids: string[] = [];
  for (const q of DEMO_QUESTIONS) {
    const [r] = await db.query(
      `insert into questions (paper, chapter, topic, difficulty, text, options, correct, solution, wrong, is_demo)
       values ('MA',$1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,true) returning id`,
      [q.chapter, q.topic, q.difficulty, q.text, JSON.stringify(q.options), q.correct, q.solution, JSON.stringify(q.wrong)],
    );
    qids.push(r.id);
  }
  const mkTest = async (title: string, type: string, mins: number, opens: number, closes: number, idxs: number[]) => {
    const [t] = await db.query(
      `insert into tests (title, paper, type, time_limit_min, opens_at, closes_at, marks, negative, is_demo) values ($1,'MA',$2,$3,$4,$5,1,0,true) returning id`,
      [title, type, mins, new Date(now.getTime() + opens).toISOString(), new Date(now.getTime() + closes).toISOString()],
    );
    for (const i of idxs) await db.query(`insert into test_questions (test_id, question_id) values ($1,$2)`, [t.id, qids[i]]);
    for (const sid of Object.values(students)) await db.query(`insert into test_assignments (test_id, student_id) values ($1,$2)`, [t.id, sid]);
    return { id: t.id as string, idxs };
  };
  const t1 = await mkTest("Quiz 1: Cost classification", "quiz", 10, -21 * day, -19 * day, [0, 1, 2, 3]);
  const t2 = await mkTest("Weekly Exam 1: Costs and absorption", "weekly", 15, -14 * day, -12 * day, [0, 1, 2, 3, 4, 5, 6, 7]);
  const t3 = await mkTest("Module Exam 1: All topics", "module", 20, -7 * day, -5 * day, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  await mkTest("Weekly Exam 2: Break-even and absorption", "weekly", 15, -1 * day, 3 * day, [4, 5, 6, 7, 8, 9, 10, 11]);

  // Past attempts: [test, correct-count, minutes taken, tab switches, wrong-option offset]
  const plan: Record<string, [typeof t1, number, number, number, number][]> = {
    "demo.aanya": [[t1, 2, 8, 0, 1], [t2, 5, 13, 1, 1], [t3, 9, 18, 0, 2]],
    "demo.rohan": [[t1, 3, 9, 1, 1], [t2, 5, 14, 2, 2], [t3, 8, 19, 1, 1]],
    "demo.kabir": [[t1, 4, 5, 0, 1], [t2, 4, 12, 3, 1], [t3, 4, 4, 7, 1]],
  };
  const when: Record<string, number> = { [t1.id]: -20 * day, [t2.id]: -13 * day, [t3.id]: -6 * day };
  for (const [uname, rows] of Object.entries(plan)) {
    for (const [t, nCorrect, mins, tabs, off] of rows) {
      const submittedAt = new Date(now.getTime() + when[t.id]! + 3600000);
      const order: Order = t.idxs.map((i) => ({ q: qids[i]!, o: [0, 1, 2, 3] }));
      const answers: Record<string, number> = {};
      t.idxs.forEach((i, k) => {
        const c = DEMO_QUESTIONS[i]!.correct;
        answers[qids[i]!] = k < nCorrect ? c : (c + off) % 4;
      });
      const [a] = await db.query(
        `insert into attempts (test_id, student_id, started_at, deadline, question_order, answers, tab_switches)
         values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) returning id`,
        [t.id, students[uname], new Date(submittedAt.getTime() - mins * 60000).toISOString(), new Date(submittedAt.getTime() + 3600000).toISOString(), JSON.stringify(order), JSON.stringify(answers), tabs],
      );
      await finalizeAttempt(db, a.id, false, submittedAt);
    }
  }
  const entry = (u: string, kind: string, value: number | null, note: string | null, ago: number) =>
    db.query(`insert into manual_entries (student_id, kind, value, note, entry_date, is_demo) values ($1,$2,$3,$4,$5,true)`, [students[u], kind, value, note, new Date(now.getTime() - ago * day).toISOString().slice(0, 10)]);
  await entry("demo.aanya", "video", 80, "Chapter 1 videos", 1);
  await entry("demo.aanya", "practice", 30, "30 questions practised", 1);
  await entry("demo.rohan", "video", 60, "Chapter 1 videos", 1);
  await entry("demo.kabir", "video", 25, "Chapter 1 videos", 6);
  await entry("demo.kabir", "note", null, "Mentor: rushed the last test. Talk about slowing down.", 5);
  return { skipped: false };
}

export async function deleteDemo(db: DB) {
  await db.tx(async (t) => {
    await t.query(`delete from tests where is_demo`);
    await t.query(`delete from questions where is_demo`);
    await t.query(`delete from users where is_demo`);
    await t.query(`delete from batches where is_demo`);
  });
}
