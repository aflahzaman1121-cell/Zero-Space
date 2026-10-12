import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, studentNav } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getResult } from "@/lib/service";

export const dynamic = "force-dynamic";
const mins = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("student");
  let r;
  try { r = await getResult(await getDB(), id, user.id); } catch { redirect("/tests"); }
  const weakest = r.topics.filter((t) => t.pct < 70).slice(0, 2);
  return (
    <Shell user={user} nav={studentNav}>
      <div className="mx-auto max-w-2xl">
        <div className="card cut bg-blue text-white" style={{ background: "#2B3CFF" }}>
          <div className="text-lilac text-sm">{r.title}{r.autoSubmitted ? " · auto-submitted when time ran out" : ""}</div>
          <div className="flex items-end gap-3 mt-2"><div className="text-5xl font-bold leading-none">{r.correctCount}<span className="text-2xl">/{r.total}</span></div><div className="pb-1">{r.pct}% · {mins(r.durationSec)}</div></div>
        </div>

        <section className="card mt-4">
          <h2 className="font-semibold mb-3">Topic scores</h2>
          <div className="space-y-3">
            {r.topics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm"><span>{t.topic}</span><b className={t.pct < 70 ? "text-[#B8420F]" : ""}>{t.correct}/{t.total}</b></div>
                <div className="h-2 rounded-full bg-lilac/50 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.pct < 70 ? "#FF6A2B" : "#2B3CFF" }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card mt-4">
          <h2 className="font-semibold mb-1">Where you went wrong</h2>
          {r.mistakes.length === 0 ? <p className="text-slate text-sm">No wrong answers to learn from here. Nice work.</p> : (
            <ul className="divide-y divide-lilac/50">
              {r.mistakes.map((m) => (
                <li key={m.tag} className="py-3">
                  <div className="flex items-start gap-2"><span className="pill pill-o shrink-0">{m.count === 1 ? "1 time" : `${m.count} times`}</span><div><div className="font-medium">{m.tag}</div><div className="text-sm text-slate">{m.explain}</div><div className="text-xs text-slate mt-1">{m.topics.join(" · ")}</div></div></div>
                </li>
              ))}
            </ul>
          )}
          {weakest.length > 0 && <p className="text-sm mt-3 border-t border-lilac/50 pt-3"><b>Next step:</b> revise {weakest.map((w) => w.topic).join(" and ")}, then try the questions again.</p>}
        </section>

        <h2 className="font-semibold mt-6 mb-3">Review every question</h2>
        <div className="space-y-4">
          {r.review.map((q) => (
            <div key={q.id} className="card">
              <div className="flex items-center justify-between"><span className="text-xs text-slate">Q{q.n} · {q.topic}</span><span className={`pill ${q.isCorrect ? "pill-g" : "pill-o"}`}>{q.isCorrect ? "Correct" : q.chosen === null ? "Not answered" : "Wrong"}</span></div>
              <p className="font-medium mt-2">{q.text}</p>
              <ul className="mt-3 space-y-2">
                {q.options.map((o, k) => {
                  const isCorrect = o.i === q.correct, picked = o.i === q.chosen;
                  return <li key={o.i} className={`rounded-xl border-2 px-3 py-2 text-sm ${isCorrect ? "border-[#2E9E5B] bg-[#EAF8F0]" : picked ? "border-ignite bg-[#FFF1EA]" : "border-lilac/60"}`}><b className="text-slate mr-2">{"ABCD"[k]}</b>{o.text}{isCorrect ? "  ✓ correct answer" : picked ? "  ← your answer" : ""}</li>;
                })}
              </ul>
              {q.misconception && <p className="text-sm mt-3 rounded-xl bg-[#FFF1EA] p-3"><b>{q.misconception.tag}.</b> {q.misconception.explain}</p>}
              {q.solution && <p className="text-sm mt-3 text-slate"><b className="text-ink">Worked solution:</b> {q.solution}</p>}
            </div>
          ))}
        </div>
        <Link href="/tests" className="btn btn-primary w-full mt-6">Back to tests</Link>
      </div>
    </Shell>
  );
}
