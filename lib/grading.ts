// Pure grading functions. Every number in the product comes from code like this, never from AI.
export type Misconception = { tag: string; explain: string };
export type Question = {
  id: string; topic: string; chapter?: string; text: string; options: string[]; correct: number; solution: string;
  wrong: Record<string, Misconception>;
};
export type QResult = { qid: string; topic: string; chosen: number | null; correct: boolean; misconception: Misconception | null };
export type TopicScore = { topic: string; correct: number; total: number; pct: number };
export type Graded = { score: number; max: number; pct: number; correctCount: number; results: QResult[]; topics: TopicScore[] };

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function grade(qids: string[], answers: Record<string, number>, qmap: Map<string, Question>, marks: number, negative: number): Graded {
  const results: QResult[] = [];
  let correctCount = 0, wrongCount = 0;
  for (const qid of qids) {
    const q = qmap.get(qid);
    if (!q) continue;
    const chosen = Number.isInteger(answers[qid]) ? answers[qid]! : null;
    const correct = chosen !== null && chosen === q.correct;
    if (correct) correctCount++;
    else if (chosen !== null) wrongCount++;
    results.push({ qid, topic: q.topic, chosen, correct, misconception: !correct && chosen !== null ? q.wrong?.[String(chosen)] ?? { tag: "Other mistake", explain: "" } : null });
  }
  const max = results.length * marks;
  const score = correctCount * marks - wrongCount * negative;
  const byTopic = new Map<string, { c: number; t: number }>();
  for (const r of results) {
    const e = byTopic.get(r.topic) ?? { c: 0, t: 0 };
    e.t++; if (r.correct) e.c++;
    byTopic.set(r.topic, e);
  }
  const topics = [...byTopic].map(([topic, e]) => ({ topic, correct: e.c, total: e.t, pct: round1((e.c / e.t) * 100) })).sort((a, b) => a.pct - b.pct);
  return { score, max, pct: max ? round1((Math.max(0, score) / max) * 100) : 0, correctCount, results, topics };
}

export type MistakeGroup = { tag: string; explain: string; count: number; topics: string[] };
/** Wrong answers grouped by misconception tag; repeated mistakes first. */
export function groupMistakes(results: QResult[]): MistakeGroup[] {
  const m = new Map<string, MistakeGroup>();
  for (const r of results) {
    if (!r.misconception) continue;
    const g = m.get(r.misconception.tag) ?? { tag: r.misconception.tag, explain: r.misconception.explain, count: 0, topics: [] };
    g.count++;
    if (!g.topics.includes(r.topic)) g.topics.push(r.topic);
    m.set(r.misconception.tag, g);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function seededShuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}
