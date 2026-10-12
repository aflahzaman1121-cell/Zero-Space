import Link from "next/link";
import { StartButton } from "./StartButton";
import { fmtDate, TYPE_LABEL, type StudentTest } from "@/lib/student";

export function TestCard({ t }: { t: StudentTest }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{t.title}</div>
          <div className="text-sm text-slate mt-0.5">{TYPE_LABEL[t.type] ?? t.type} · {t.paper} · {t.nQuestions} questions · {t.time_limit_min} min</div>
        </div>
        {t.status === "open" && <span className="pill pill-o shrink-0">Open</span>}
        {t.status === "in_progress" && <span className="pill pill-o shrink-0">In progress</span>}
        {t.status === "upcoming" && <span className="pill shrink-0">Upcoming</span>}
        {t.status === "completed" && <span className="pill pill-g shrink-0">{t.pct}%</span>}
        {t.status === "missed" && <span className="pill shrink-0">Closed</span>}
      </div>
      <div className="text-xs text-slate mt-2">
        {t.status === "upcoming" ? `Opens ${fmtDate(t.opens_at)}` : t.status === "completed" || t.status === "missed" ? `Closed ${fmtDate(t.closes_at)}` : `Closes ${fmtDate(t.closes_at)}`}
      </div>
      {t.status === "open" && <div className="mt-3"><StartButton testId={t.id} /></div>}
      {t.status === "in_progress" && <div className="mt-3"><StartButton testId={t.id} resume={t.attemptId} /></div>}
      {t.status === "completed" && t.attemptId && <Link href={`/result/${t.attemptId}`} className="btn btn-ghost w-full mt-3">See result</Link>}
    </div>
  );
}
