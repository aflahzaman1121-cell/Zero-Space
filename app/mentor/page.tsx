import Link from "next/link";
import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage, first } from "@/lib/mentor";
import { arrow, flags, FLAG_LABEL, loadBank, loadStudents, loadWeights, lastActivity, readiness, rollup, type Flag } from "@/lib/analytics";

export const dynamic = "force-dynamic";
const ago = (d: Date | null, now: Date) => { if (!d) return "never"; const h = (now.getTime() - d.getTime()) / 3600000; return h < 1 ? "just now" : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`; };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { user, db, unread } = await mentorPage();
  const batchF = first(sp.batch), flagF = first(sp.flag);
  const now = new Date();
  const [all, bank, w, batches] = await Promise.all([loadStudents(db), loadBank(db), loadWeights(db), db.query(`select id, name from batches order by name`)]);
  const rows = [...all.values()].map((s) => {
    const rd = readiness(s, bank, w, now), fl = flags(s, rd.score, w.low_readiness, now);
    const wk = rollup(s, "week", now, "all", now);
    return { s, rd, fl, wk, la: lastActivity(s) };
  }).filter((r) => (!batchF || r.s.user.batch_id === batchF) && (!flagF || r.fl.includes(flagF as Flag)))
    .sort((a, b) => (a.rd.score ?? -1) - (b.rd.score ?? -1));
  const q = (o: Record<string, string>) => "/mentor?" + new URLSearchParams({ batch: batchF, flag: flagF, ...o }).toString();
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
        <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-slate text-sm">Students needing attention come first.</p></div>
        {unread > 0 && <Link href="/mentor/inbox" className="btn btn-ignite">{unread} new test report{unread > 1 ? "s" : ""}</Link>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4 text-xs font-semibold">
        <Link href={q({ batch: "" })} className={`px-3 py-1.5 rounded-full ${!batchF ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>All batches</Link>
        {batches.map((b) => <Link key={b.id} href={q({ batch: b.id })} className={`px-3 py-1.5 rounded-full ${batchF === b.id ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>{b.name}</Link>)}
        <span className="w-2" />
        <Link href={q({ flag: "" })} className={`px-3 py-1.5 rounded-full ${!flagF ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>Any status</Link>
        {(Object.keys(FLAG_LABEL) as Flag[]).map((f) => <Link key={f} href={q({ flag: f })} className={`px-3 py-1.5 rounded-full ${flagF === f ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>{FLAG_LABEL[f]}</Link>)}
      </div>
      {rows.length === 0 ? <div className="card text-slate">No students match. <Link className="text-blue font-medium" href="/mentor/students">Add a student</Link>.</div> : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-xs text-slate"><th className="p-3">Student</th><th>Readiness</th><th>This week</th><th>Last active</th><th>Flags</th></tr></thead>
            <tbody>{rows.map(({ s, rd, fl, wk, la }) => (
              <tr key={s.user.id} className="border-t border-lilac/50 hover:bg-lilac/20">
                <td className="p-3"><Link href={`/mentor/students/${s.user.id}`} className="font-semibold text-blue">{s.user.full_name}</Link><div className="text-xs text-slate">{s.user.batch_name ?? "No batch"}</div></td>
                <td className="font-bold text-lg">{rd.score ?? "–"}</td>
                <td>{wk.avgPct === null ? "–" : `${wk.avgPct}%`} <span className={wk.trend === "down" ? "text-[#B8420F]" : wk.trend === "up" ? "text-[#17693A]" : "text-slate"}>{arrow(wk.trend)}</span></td>
                <td className="text-slate">{ago(la, now)}</td>
                <td>{fl.length ? fl.map((f) => <span key={f} className="pill pill-o mr-1">{FLAG_LABEL[f]}</span>) : <span className="text-slate">–</span>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
