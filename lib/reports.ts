// Parent message. All facts come from computed roll-ups. The wording is a replaceable step.
import { arrow, type Rollup, type Readiness } from "./analytics";

export type Facts = {
  student: string; parent: string; weekLabel: string; taken: number; assigned: number; avg: number | null; prevAvg: number | null;
  weakest: { topic: string; pct: number } | null; best: { topic: string } | null; readiness: number | null; openTests: number; topMistake: string | null;
};

export function factsFrom(student: string, parent: string | null, weekLabel: string, cur: Rollup, readiness: Readiness, openTests: number): Facts {
  return {
    student, parent: parent || "Parent", weekLabel, taken: cur.taken, assigned: cur.assigned, avg: cur.avgPct, prevAvg: cur.prevAvgPct,
    weakest: cur.weakest && cur.weakest.pct < 100 ? { topic: cur.weakest.topic, pct: cur.weakest.pct } : null, best: cur.best ? { topic: cur.best.topic } : null,
    readiness: readiness.score, openTests, topMistake: cur.mistakes[0]?.tag ?? null,
  };
}

/** Template wording. To use AI wording later, replace this function with one that rephrases the same Facts, and keep every number from Facts. */
export function templateWording(f: Facts): string {
  const first = f.student.split(" ")[0];
  const lines: string[] = [`Hello ${f.parent},`, "", `Here is ${first}'s weekly update from The Zero School (${f.weekLabel}).`, ""];
  lines.push(f.assigned ? `Tests: ${f.taken} of ${f.assigned} completed this week.` : f.taken ? `Tests: ${f.taken} completed this week.` : "Tests: none were due this week.");
  if (f.avg !== null) {
    const d = f.prevAvg === null ? "" : f.avg - f.prevAvg > 2 ? ` (up from ${f.prevAvg}% last week)` : f.avg - f.prevAvg < -2 ? ` (down from ${f.prevAvg}% last week)` : ` (about the same as last week, ${f.prevAvg}%)`;
    lines.push(`Average score: ${f.avg}%${d}.`);
  }
  if (f.best) lines.push(`Strongest topic: ${f.best.topic}.`);
  if (f.weakest) lines.push(`Needs more work: ${f.weakest.topic} (${f.weakest.pct}% correct).`);
  if (f.topMistake) lines.push(`Most repeated mistake: ${f.topMistake}.`);
  if (f.readiness !== null) lines.push(`Readiness score: ${f.readiness} out of 100.`);
  lines.push("", f.weakest ? `Next step: revise ${f.weakest.topic} and retry the questions that were missed.` : f.openTests ? `Next step: complete the ${f.openTests} open test(s) on zero space.` : "Next step: keep up the daily practice.");
  lines.push("", "Please reply to this message if you would like to speak with the mentor.", "", "The Zero School");
  return lines.join("\n");
}
export const wording: (f: Facts) => string = templateWording; // <-- AI wording plugs in here
export { arrow };
