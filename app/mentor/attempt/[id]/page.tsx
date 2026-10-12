import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage } from "@/lib/mentor";
import { getResult } from "@/lib/service";
import { markRead } from "@/app/actions";

export const dynamic = "force-dynamic";
const mins = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;
export default async function MentorAttempt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, db, unread } = await mentorPage();
  let r; try { r = await getResult(db, id, null); } catch { notFound(); }
  const [who] = await db.query(`select u.full_name, u.id, rp.id as report_id, rp.is_read from attempts a join users u on u.id=a.student_id left join attempt_reports rp on rp.attempt_id=a.id where a.id=$1`, [id]);
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <div className="max-w-3xl">
        <Link href="/mentor/inbox" className="text-blue text-sm font-medium">← Test reports</Link>
        <div className="card cut mt-2" style={{ background: "#2B3CFF", color: "#fff" }}>
          <div className="text-lilac text-sm"><Link className="underline" href={`/mentor/students/${who?.id}`}>{who?.full_name}</Link> · {r.title}</div>
          <div className="text-4xl font-bold mt-1">{r.correctCount}/{r.total} <span className="text-xl">· {r.pct}%</span></div>
          <div className="text-sm text-lilac mt-1">Took {mins(r.durationSec)}{r.autoSubmitted ? " · auto-submitted" : ""} · {r.tabSwitches} tab switch{r.tabSwitches === 1 ? "" : "es"}</div>
        </div>
        {who?.report_id && !who.is_read && <form action={markRead} className="mt-3"><input type="hidden" name="id" value={who.report_id} /><button className="btn btn-ghost">Mark as read</button></form>}
        <section className="card mt-4"><h2 className="font-semibold mb-2">Topics</h2>
          {r.topics.map((t) => <div key={t.topic} className="flex justify-between text-sm py-1"><span>{t.topic}</span><b className={t.pct < 70 ? "text-[#B8420F]" : ""}>{t.correct}/{t.total}</b></div>)}</section>
        <section className="card mt-4"><h2 className="font-semibold mb-2">Where they went wrong</h2>
          {r.mistakes.length === 0 ? <p className="text-sm text-slate">No wrong answers.</p> : r.mistakes.map((m) => <div key={m.tag} className="py-2 text-sm border-t first:border-0 border-lilac/50"><span className="pill pill-o mr-2">{m.count}×</span><b>{m.tag}</b><div className="text-slate">{m.explain}</div></div>)}</section>
        <h2 className="font-semibold mt-6 mb-3">Every question</h2>
        <div className="space-y-3">{r.review.map((q) => (
          <div key={q.id} className="card">
            <div className="flex justify-between text-xs text-slate"><span>Q{q.n} · {q.topic}</span><span className={`pill ${q.isCorrect ? "pill-g" : "pill-o"}`}>{q.isCorrect ? "Correct" : q.chosen === null ? "Not answered" : "Wrong"}</span></div>
            <p className="font-medium mt-2">{q.text}</p>
            <ul className="mt-2 text-sm space-y-1">{q.options.map((o, k) => <li key={o.i} className={o.i === q.correct ? "text-[#17693A] font-semibold" : o.i === q.chosen ? "text-[#B8420F] font-semibold" : ""}>{"ABCD"[k]}. {o.text}{o.i === q.correct ? " ✓" : o.i === q.chosen ? " ← chose" : ""}</li>)}</ul>
            {q.misconception && <p className="text-sm mt-2 rounded-xl bg-[#FFF1EA] p-3"><b>{q.misconception.tag}.</b> {q.misconception.explain}</p>}
          </div>))}</div>
      </div>
    </Shell>
  );
}
