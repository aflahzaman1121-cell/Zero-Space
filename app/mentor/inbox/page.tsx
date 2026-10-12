import Link from "next/link";
import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage } from "@/lib/mentor";
import { fmtDate } from "@/lib/student";
import { markRead, markAllRead } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Inbox() {
  const { user, db, unread } = await mentorPage();
  const rows = await db.query(`select r.id, r.attempt_id, r.summary, r.is_read, r.created_at, r.data, u.full_name, t.title from attempt_reports r join users u on u.id=r.student_id join tests t on t.id=r.test_id order by r.created_at desc limit 100`);
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-bold">Test reports</h1>
        {unread > 0 && <form action={markAllRead}><button className="btn btn-ghost">Mark all read</button></form>}</div>
      {rows.length === 0 && <p className="card text-slate">Reports appear here as soon as a student finishes a test.</p>}
      <div className="space-y-3">{rows.map((r) => {
        const fl: string[] = r.data?.flags ?? [];
        return (
          <div key={r.id} className={`card ${r.is_read ? "" : "border-l-4 border-ignite"}`}>
            <div className="flex justify-between gap-2 flex-wrap"><div><b>{r.full_name}</b> <span className="text-slate">· {r.title}</span></div><span className="text-xs text-slate">{fmtDate(new Date(r.created_at).toISOString())}</span></div>
            <p className="text-sm mt-2">{r.summary}</p>
            {fl.length > 0 && <div className="mt-2">{fl.map((f) => <span key={f} className="pill pill-o mr-1">{f}</span>)}</div>}
            <div className="flex gap-2 mt-3">
              <Link href={`/mentor/attempt/${r.attempt_id}`} className="btn btn-primary !min-h-[40px]">Full review</Link>
              {!r.is_read && <form action={markRead}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost !min-h-[40px]">Mark read</button></form>}
            </div>
          </div>);
      })}</div>
    </Shell>
  );
}
