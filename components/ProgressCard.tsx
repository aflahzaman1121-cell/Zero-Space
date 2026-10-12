import Link from "next/link";
import { TrendChart } from "./TrendChart";
import { PrintButton } from "./PrintButton";
import { arrow, flags, FLAG_LABEL, readiness, rollup, type Kind, type StudentData, type Weights } from "@/lib/analytics";
import { TYPE_LABEL } from "@/lib/student";

const KINDS: Kind[] = ["week", "month", "year"];
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...o });

export function ProgressCard({ name, data, bank, weights, kind, type, base, showNotes, showFlags }: {
  name: string; data: StudentData; bank: string[]; weights: Weights; kind: Kind; type: string; base: string; showNotes: boolean; showFlags: boolean;
}) {
  const now = new Date();
  const r = rollup(data, kind, now, type, now);
  const ready = readiness(data, bank, weights, now);
  const fl = flags(data, ready.score, weights.low_readiness, now);
  const href = (k: string, t: string) => `${base}?p=${k}&type=${t}`;
  const period = kind === "year" ? fmt(r.start, { year: "numeric" }) : kind === "month" ? fmt(r.start, { month: "long", year: "numeric" }) : `${fmt(r.start, { day: "numeric", month: "short" })} to ${fmt(new Date(r.end.getTime() - 1), { day: "numeric", month: "short" })}`;
  const pts = r.attempts.map((a) => ({ label: fmt(a.date, { day: "numeric", month: "short" }), pct: a.pct, title: a.title }));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 no-print mb-3">
        <div className="flex gap-1">{KINDS.map((k) => <Link key={k} href={href(k, type)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${k === kind ? "bg-blue text-white" : "bg-white text-blue border-2 border-lilac"}`}>{k === "week" ? "Week" : k === "month" ? "Month" : "Year"}</Link>)}</div>
        <div className="flex flex-wrap gap-1">{["all", ...Object.keys(TYPE_LABEL)].map((t) => <Link key={t} href={href(kind, t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${t === type ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>{t === "all" ? "All tests" : TYPE_LABEL[t]}</Link>)}</div>
        <PrintButton />
      </div>

      <div className="card cut bg-blue text-white" style={{ background: "#2B3CFF" }}>
        <div className="text-lilac text-sm">{name} · {period}{type !== "all" ? ` · ${TYPE_LABEL[type]}` : ""}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          <Stat label="Readiness" value={ready.score === null ? "–" : `${ready.score}`} sub="out of 100" />
          <Stat label="Average score" value={r.avgPct === null ? "–" : `${r.avgPct}%`} sub={r.prevAvgPct === null ? "no earlier period" : `${arrow(r.trend)} vs ${r.prevAvgPct}% before`} />
          <Stat label="Tests done" value={r.assigned ? `${r.taken}/${r.assigned}` : `${r.taken}`} sub="completed / due" />
          <Stat label="Practice" value={`${r.practiceCount}`} sub={r.videoPct === null ? "questions logged" : `questions · video ${r.videoPct}%`} />
        </div>
        {showFlags && fl.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{fl.map((f) => <span key={f} className="pill pill-o">{FLAG_LABEL[f]}</span>)}</div>}
      </div>

      <section className="card mt-4">
        <h2 className="font-semibold mb-2">Scores in this period</h2>
        {pts.length ? <TrendChart points={pts} /> : <p className="text-sm text-slate">No tests were taken in this period.</p>}
      </section>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <section className="card">
          <h2 className="font-semibold mb-2">Topics</h2>
          {r.topics.length === 0 ? <p className="text-sm text-slate">No topic data yet.</p> : (
            <div className="space-y-2.5">{r.topics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm"><span>{t.topic}</span><b className={t.pct < 70 ? "text-[#B8420F]" : ""}>{t.pct}% <span className="font-normal text-slate">({t.correct}/{t.total})</span></b></div>
                <div className="h-2 rounded-full bg-lilac/50 mt-1 overflow-hidden"><div className="h-full" style={{ width: `${t.pct}%`, background: t.pct < 70 ? "#FF6A2B" : "#2B3CFF" }} /></div>
              </div>))}
            </div>)}
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2">Repeated mistakes</h2>
          {r.mistakes.length === 0 ? <p className="text-sm text-slate">No mistakes recorded.</p> : (
            <ul className="divide-y divide-lilac/50">{r.mistakes.map((m) => (
              <li key={m.tag} className="py-2 text-sm"><span className="pill pill-o mr-2">{m.count}×</span><b>{m.tag}</b><div className="text-xs text-slate mt-1">{m.topics.join(" · ")}</div></li>))}
            </ul>)}
        </section>
      </div>

      <section className="card mt-4">
        <h2 className="font-semibold mb-1">How the readiness score is calculated</h2>
        <p className="text-xs text-slate mb-3">Each part is scored 0 to 100. Parts with no data yet are left out and the rest are rescaled.</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate text-xs"><th className="py-1">Part</th><th>Weight</th><th>Score</th><th className="hidden sm:table-cell">Based on</th></tr></thead>
          <tbody>{ready.parts.map((p) => <tr key={p.key} className="border-t border-lilac/50"><td className="py-2">{p.label}</td><td>{p.weight}%</td><td className="font-semibold">{p.value === null ? "–" : Math.round(p.value)}</td><td className="hidden sm:table-cell text-slate">{p.note}</td></tr>)}</tbody>
        </table>
      </section>

      {showNotes && r.notes.length > 0 && (
        <section className="card mt-4"><h2 className="font-semibold mb-2">Mentor notes</h2>
          <ul className="space-y-2 text-sm">{r.notes.map((n, i) => <li key={i}><span className="text-slate">{fmt(n.date, { day: "numeric", month: "short" })}:</span> {n.note}</li>)}</ul></section>
      )}
    </div>
  );
}
function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div><div className="text-lilac text-xs">{label}</div><div className="text-3xl font-bold leading-tight">{value}</div><div className="text-xs text-lilac">{sub}</div></div>;
}
