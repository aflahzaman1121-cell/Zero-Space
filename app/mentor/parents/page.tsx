import { Shell, mentorNav } from "@/components/Shell";
import { ParentButtons } from "@/components/ParentButtons";
import { PrintButton } from "@/components/PrintButton";
import { mentorPage, first } from "@/lib/mentor";
import { range } from "@/lib/analytics";
import { generateParentReports, saveParentReport } from "@/app/actions";

export const dynamic = "force-dynamic";
const ymd = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
export default async function Parents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { user, db, unread } = await mentorPage();
  const w = /^\d{4}-\d{2}-\d{2}$/.test(first(sp.week)) ? first(sp.week) : ymd(range("week", new Date()).start);
  const rows = await db.query(`select r.id, r.body, r.status, u.full_name, u.parent_name, u.parent_phone from parent_reports r join users u on u.id=r.student_id where r.week_start=$1 order by u.full_name`, [w]);
  const prev = ymd(new Date(new Date(w + "T00:00:00+05:30").getTime() - 7 * 86400000)), next = ymd(new Date(new Date(w + "T00:00:00+05:30").getTime() + 7 * 86400000));
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <h1 className="text-2xl font-bold">Parent updates</h1>
      <p className="text-slate text-sm mb-4">Drafts are written from the real numbers. Edit, approve, then copy and send yourself. Nothing is sent automatically.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <a className="btn btn-ghost !min-h-[40px]" href={`/mentor/parents?week=${prev}`}>←</a>
        <span className="font-semibold">Week starting {w}</span>
        <a className="btn btn-ghost !min-h-[40px]" href={`/mentor/parents?week=${next}`}>→</a>
        <form action={generateParentReports}><input type="hidden" name="week" value={w + "T12:00:00+05:30"} /><button className="btn btn-ignite !min-h-[40px]">Generate drafts</button></form>
        <PrintButton label="Print" />
      </div>
      {rows.length === 0 && <p className="card text-slate">No drafts for this week yet.</p>}
      <div className="space-y-4">{rows.map((r) => (
        <form key={r.id} action={saveParentReport} className="card">
          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="week" value={w} />
          <div className="flex justify-between flex-wrap gap-2 mb-2"><div><b>{r.full_name}</b> <span className="text-slate text-sm">· to {r.parent_name} {r.parent_phone}</span></div><span className={`pill ${r.status === "approved" ? "pill-g" : "pill-o"}`}>{r.status === "approved" ? "Approved" : "Draft"}</span></div>
          <textarea name="body" defaultValue={r.body} rows={12} className="input !py-3 text-sm" />
          <ParentButtons approved={r.status === "approved"} text={r.body} />
        </form>))}</div>
    </Shell>
  );
}
