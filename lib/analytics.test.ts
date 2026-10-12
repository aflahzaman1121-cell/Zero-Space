import { describe, it, expect, beforeAll } from "vitest";
import { getDB, type DB } from "./db";
import { seedDemo } from "./demo";
import { loadStudents, loadWeights, loadBank, readiness, rollup, flags, range, trendOf, topicTable, type StudentData, type GAttempt } from "./analytics";

let db: DB;
beforeAll(async () => { db = await getDB(); await seedDemo(db); }, 60000);

const att = (pct: number, daysAgo: number, now: Date, type = "quiz"): GAttempt => ({
  id: String(Math.random()), testId: String(Math.random()), title: "t", paper: "MA", type, startedAt: new Date(now.getTime() - daysAgo * 86400000), submittedAt: new Date(now.getTime() - daysAgo * 86400000),
  pct, results: [], tabSwitches: 0, durationSec: 100, timeLimitMin: 10,
});

describe("ranges", () => {
  it("weeks start on Monday in Indian time", () => {
    const r = range("week", new Date("2026-10-14T10:00:00Z")); // Wednesday
    expect(r.start.toISOString()).toBe("2026-10-11T18:30:00.000Z"); // Mon 12 Oct 00:00 IST
    expect(r.end.getTime() - r.start.getTime()).toBe(7 * 86400000);
  });
});
describe("trend", () => {
  it("up, down, flat with a 2 point dead zone", () => {
    expect([trendOf(70, 60), trendOf(50, 60), trendOf(61, 60), trendOf(60, null)]).toEqual(["up", "down", "flat", null]);
  });
});
describe("readiness", () => {
  it("rescales weights when a part has no data, and a new student gets no score", async () => {
    const now = new Date();
    const w = await loadWeights(db);
    expect(readiness({ attempts: [], assigned: [], entries: [], createdAt: now }, [], w, now).score).toBeNull();
    const one: StudentData = { attempts: [att(80, 1, now)], assigned: [], entries: [], createdAt: now };
    expect(readiness(one, [], w, now).score).toBe(80); // only "recent" is available, so it carries all the weight
  });
  it("rewards improvement over decline", async () => {
    const now = new Date(); const w = await loadWeights(db);
    const up: StudentData = { attempts: [att(40, 4, now), att(50, 3, now), att(70, 2, now), att(80, 1, now)], assigned: [], entries: [], createdAt: now };
    const down: StudentData = { attempts: [att(80, 4, now), att(70, 3, now), att(50, 2, now), att(40, 1, now)], assigned: [], entries: [], createdAt: now };
    const pu = readiness(up, [], w, now).parts.find((p) => p.key === "trend")!.value!;
    const pd = readiness(down, [], w, now).parts.find((p) => p.key === "trend")!.value!;
    expect(pu).toBeGreaterThan(50); expect(pd).toBeLessThan(50);
  });
});
describe("demo students", () => {
  it("Kabir is flagged for falling scores and inactivity; Aanya is not", async () => {
    const now = new Date(); const w = await loadWeights(db); const bank = await loadBank(db);
    const all = await loadStudents(db);
    const by = (u: string) => [...all.values()].find((s) => s.user.username === u)!;
    const k = by("demo.kabir"), a = by("demo.aanya");
    const rk = readiness(k, bank, w, now), ra = readiness(a, bank, w, now);
    expect(flags(k, rk.score, w.low_readiness, now)).toEqual(expect.arrayContaining(["falling", "inactive"]));
    expect(flags(a, ra.score, w.low_readiness, now)).toEqual([]);
    expect(ra.score!).toBeGreaterThan(rk.score!);
  });
  it("monthly roll-up counts taken versus assigned and shows the repeated mistake first", async () => {
    const all = await loadStudents(db);
    const k = [...all.values()].find((s) => s.user.username === "demo.kabir")!;
    const r = rollup(k, "year", new Date());
    expect(r.assigned).toBe(3); // three past tests closed this year; the open one has not closed yet
    expect(r.taken).toBe(3);
    expect(r.mistakes[0]!.count).toBeGreaterThanOrEqual(2);
    expect(rollup(k, "year", new Date(), "quiz").attempts.length).toBe(1);
  });
  it("topic table is weakest first", () => {
    const t = topicTable([{ ...att(0, 1, new Date()), results: [{ id: "1", t: "A", c: true, g: null, e: null }, { id: "2", t: "B", c: false, g: "x", e: "" }] }]);
    expect(t.map((x) => x.topic)).toEqual(["B", "A"]);
  });
});
