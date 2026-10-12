import { describe, it, expect } from "vitest";
import { grade, groupMistakes, type Question } from "./grading";

const mk = (id: string, topic: string, correct: number): Question => ({
  id, topic, text: id, options: ["a", "b", "c", "d"], correct, solution: "",
  wrong: { "0": { tag: "T0", explain: "e0" }, "1": { tag: "T1", explain: "e1" }, "2": { tag: "T2", explain: "e2" }, "3": { tag: "T3", explain: "e3" } },
});
const qm = new Map([mk("q1", "A", 1), mk("q2", "A", 2), mk("q3", "B", 0), mk("q4", "B", 3)].map((q) => [q.id, q]));

describe("grade", () => {
  it("scores correct, wrong and blank answers", () => {
    const g = grade(["q1", "q2", "q3", "q4"], { q1: 1, q2: 0, q3: 0 }, qm, 1, 0);
    expect(g.correctCount).toBe(2);
    expect(g.score).toBe(2);
    expect(g.max).toBe(4);
    expect(g.pct).toBe(50);
    expect(g.results.find((r) => r.qid === "q4")!.misconception).toBeNull(); // blank is not a misconception
    expect(g.results.find((r) => r.qid === "q2")!.misconception!.tag).toBe("T0");
  });
  it("applies negative marking only to wrong answers, never below 0%", () => {
    const g = grade(["q1", "q2"], { q1: 0, q2: 0 }, qm, 1, 0.5);
    expect(g.score).toBe(-1);
    expect(g.pct).toBe(0);
  });
  it("builds topic scores, weakest first", () => {
    const g = grade(["q1", "q2", "q3", "q4"], { q1: 1, q2: 2, q3: 1, q4: 0 }, qm, 1, 0);
    expect(g.topics.map((t) => [t.topic, t.pct])).toEqual([["B", 0], ["A", 100]]);
  });
});

describe("groupMistakes", () => {
  it("puts repeated mistakes first", () => {
    const g = grade(["q1", "q2", "q3"], { q1: 0, q2: 0, q3: 1 }, qm, 1, 0);
    const m = groupMistakes(g.results);
    expect(m[0]).toMatchObject({ tag: "T0", count: 2 });
    expect(m[1]).toMatchObject({ tag: "T1", count: 1 });
  });
});
