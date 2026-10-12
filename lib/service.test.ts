import { describe, it, expect, beforeAll } from "vitest";
import { getDB, type DB } from "./db";
import { seedDemo, deleteDemo } from "./demo";
import { startAttempt, getAttemptForTake, saveProgress, submitAttempt, getResult, sweepExpired } from "./service";

let db: DB;
let aanya: string, openTest: string;
beforeAll(async () => {
  db = await getDB();
  await seedDemo(db);
  [{ id: aanya }] = await db.query(`select id from users where username='demo.aanya'`) as any;
  [{ id: openTest }] = await db.query(`select id from tests where title like 'Weekly Exam 2%'`) as any;
}, 60000);

describe("demo seed", () => {
  it("creates reports for past attempts, with Kabir flagged", async () => {
    const rows = await db.query(`select u.username, r.data from attempt_reports r join users u on u.id=r.student_id order by r.created_at`);
    expect(rows.length).toBe(9);
    const kabirLast = rows.filter((r) => r.username === "demo.kabir").at(-1)!;
    expect(kabirLast.data.flags.join()).toMatch(/7 tab switches/);
    expect(kabirLast.data.delta).toBeLessThan(0);
  });
});

describe("taking a test", () => {
  let attemptId: string;
  it("starts once and returns the same attempt on repeat", async () => {
    const a = await startAttempt(db, aanya, openTest);
    const b = await startAttempt(db, aanya, openTest);
    attemptId = a.attemptId;
    expect(b.attemptId).toBe(a.attemptId);
  });
  it("does not leak correct answers while taking", async () => {
    const t = await getAttemptForTake(db, attemptId, aanya);
    expect(t.submitted).toBe(false);
    expect(JSON.stringify(t)).not.toMatch(/correct|solution|tag/i);
  });
  it("saves answers, grades on submit, creates one report, and ignores a second submit", async () => {
    const t: any = await getAttemptForTake(db, attemptId, aanya);
    const answers: Record<string, number> = {};
    const [q0] = await db.query(`select id, correct from questions where id = $1`, [t.questions[0].id]);
    answers[q0.id] = q0.correct;
    await saveProgress(db, aanya, { attemptId, answers, timeDelta: { [q0.id]: 5000 }, blurs: 2 });
    await submitAttempt(db, aanya, attemptId);
    await submitAttempt(db, aanya, attemptId);
    const reports = await db.query(`select * from attempt_reports where attempt_id=$1`, [attemptId]);
    expect(reports.length).toBe(1);
    const r = await getResult(db, attemptId, aanya);
    expect(r.correctCount).toBe(1);
    expect(r.total).toBe(8);
    expect(r.tabSwitches).toBe(2);
    expect(r.mistakes.length).toBe(0); // blanks are not misconceptions
  });
  it("blocks another student's attempt", async () => {
    const [k] = await db.query(`select id from users where username='demo.kabir'`);
    await expect(getResult(db, attemptId, k.id)).rejects.toThrow();
  });
});

describe("timer", () => {
  it("auto-submits an expired attempt and refuses late saves", async () => {
    const [rohan] = await db.query(`select id from users where username='demo.rohan'`);
    const { attemptId } = await startAttempt(db, rohan.id, openTest, new Date());
    const later = new Date(Date.now() + 16 * 60000); // 15-minute test
    const res = await saveProgress(db, rohan.id, { attemptId, answers: {}, timeDelta: {}, blurs: 0 }, later);
    expect(res.submitted).toBe(true);
    const [a] = await db.query(`select submitted_at, auto_submitted from attempts where id=$1`, [attemptId]);
    expect(a.auto_submitted).toBe(true);
    await sweepExpired(db, rohan.id, later);
    expect((await db.query(`select * from attempt_reports where attempt_id=$1`, [attemptId])).length).toBe(1);
  });
  it("refuses to start outside the window", async () => {
    const [kabir] = await db.query(`select id from users where username='demo.kabir'`);
    await expect(startAttempt(db, kabir.id, openTest, new Date(Date.now() + 10 * 86400000))).rejects.toThrow(/closed/);
  });
});

describe("demo deletion", () => {
  it("removes all demo data in one go", async () => {
    await deleteDemo(db);
    const [c] = await db.query(`select (select count(*) from users)::int u, (select count(*) from questions)::int q, (select count(*) from attempts)::int a`);
    expect(c).toEqual({ u: 0, q: 0, a: 0 });
  });
});
