import { describe, it, expect } from "vitest";
import { csvTemplate, parseInput, parseCSV } from "./import";

describe("import", () => {
  it("accepts the downloadable template as-is", () => {
    const { rows } = parseInput(csvTemplate(), "csv");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.q!.correct).toBe(2);
    expect(Object.keys(rows[0]!.q!.wrong)).toEqual(["0", "1", "3"]);
  });
  it("handles quotes, commas and line breaks inside cells", () => {
    expect(parseCSV('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([{ a: "x, y", b: 'say "hi"\nthere' }]);
  });
  it("reports every problem in a bad row", () => {
    const { rows } = parseInput(JSON.stringify([{ paper: "MA", topic: "T", question: "q", options: ["a", "a", "c", ""], correct: "E" }]), "json");
    const e = rows[0]!.errors.join(" | ");
    expect(rows[0]!.ok).toBe(false);
    expect(e).toMatch(/Missing chapter/); expect(e).toMatch(/Missing option D/); expect(e).toMatch(/identical/); expect(e).toMatch(/Correct answer/);
  });
  it("accepts JSON with an options array and a wrong map", () => {
    const j = [{ paper: "ma", chapter: "c", topic: "t", question: "q", options: ["1", "2", "3", "4"], correct: "B", solution: "s", wrong: { A: { tag: "x", explain: "e" }, C: { tag: "y" }, D: { tag: "z" } } }];
    const { rows } = parseInput(JSON.stringify(j), "json");
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.q!.paper).toBe("MA");
  });
  it("requires a tag on each wrong option", () => {
    const j = [{ paper: "MA", chapter: "c", topic: "t", question: "q", options: ["1", "2", "3", "4"], correct: "B", solution: "s", wrong: { A: { tag: "x" } } }];
    expect(parseInput(JSON.stringify(j), "json").rows[0]!.errors.join()).toMatch(/Option C.*tag/);
  });
  it("rejects garbage cleanly", () => {
    expect(parseInput("{not json", "json").fatal).toMatch(/valid JSON/);
    expect(parseInput("", "csv").fatal).toBeTruthy();
  });
});
