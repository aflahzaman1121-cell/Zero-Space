import type { DB } from "./db";
import { sweepExpired } from "./service";

export type TestStatus = "upcoming" | "open" | "in_progress" | "completed" | "missed";
export type StudentTest = {
  id: string; title: string; paper: string; type: string; time_limit_min: number; opens_at: string; closes_at: string;
  nQuestions: number; status: TestStatus; attemptId: string | null; pct: number | null;
};

export const TYPE_LABEL: Record<string, string> = { quiz: "Quiz", weekly: "Weekly exam", module: "Module exam", practice: "Practice test", mock: "Mock" };

export async function getStudentTests(db: DB, studentId: string, now = new Date()): Promise<StudentTest[]> {
  await sweepExpired(db, studentId, now);
  const rows = await db.query(
    `select t.id, t.title, t.paper, t.type, t.time_limit_min, t.opens_at, t.closes_at,
            (select count(*)::int from test_questions q where q.test_id=t.id) as n_questions,
            a.id as attempt_id, a.submitted_at, a.score, a.max_score
     from test_assignments s join tests t on t.id=s.test_id
     left join attempts a on a.test_id=t.id and a.student_id=s.student_id
     where s.student_id=$1 order by t.opens_at desc`,
    [studentId],
  );
  return rows.map((r) => {
    const opens = new Date(r.opens_at), closes = new Date(r.closes_at);
    let status: TestStatus;
    if (r.submitted_at) status = "completed";
    else if (r.attempt_id) status = "in_progress";
    else if (now < opens) status = "upcoming";
    else if (now < closes) status = "open";
    else status = "missed";
    return {
      id: r.id, title: r.title, paper: r.paper, type: r.type, time_limit_min: r.time_limit_min,
      opens_at: opens.toISOString(), closes_at: closes.toISOString(), nQuestions: r.n_questions, status,
      attemptId: r.attempt_id ?? null, pct: r.submitted_at && r.max_score ? Math.round((Math.max(0, r.score) / r.max_score) * 1000) / 10 : null,
    };
  });
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export function timeLeft(iso: string, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
  return d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h ${Math.floor((ms % 3600000) / 60000)}m` : `${Math.max(1, Math.floor(ms / 60000))}m`;
}
