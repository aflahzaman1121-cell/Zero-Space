import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, mentorNav } from "@/components/Shell";
import { ProgressCard } from "@/components/ProgressCard";
import { mentorPage, first } from "@/lib/mentor";
import { loadBank, loadStudents, loadWeights, type Kind } from "@/lib/analytics";
import { addEntry, resetStudentPassword, setStudentBatch } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params; const sp = await searchParams;
  const { user, db, unread } = await mentorPage();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [all, bank, w, batches] = await Promise.all([loadStudents(db, [id]), loadBank(db), loadWeights(db), db.query(`select id, name from batches order by name`)]);
  const s = all.get(id); if (!s) notFound();
  const kind = (["week", "month", "year"].includes(first(sp.p)) ? first(sp.p) : "week") as Kind;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <Link href="/mentor" className="text-blue text-sm font-medium no-print">← Dashboard</Link>
      <div className="mt-2"><ProgressCard name={s.user.full_name} data={s} bank={bank} weights={w} kind={kind} type={first(sp.type) || "all"} base={`/mentor/students/${id}`} showNotes showFlags /></div>
      <div className="grid md:grid-cols-2 gap-4 mt-6 no-print">
        <form action={addEntry} className="card space-y-3">
          <h2 className="font-semibold">Add an entry</h2>
          <input type="hidden" name="student_id" value={id} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label><select name="kind" className="input"><option value="practice">Practice questions done</option><option value="video">Video completion %</option><option value="note">Mentor note</option></select></div>
            <div><label className="label">Date</label><input type="date" name="entry_date" defaultValue={today} className="input" /></div>
          </div>
          <div><label className="label">Number (practice count or %)</label><input name="value" type="number" step="any" className="input" /></div>
          <div><label className="label">Note (for notes)</label><input name="note" className="input" /></div>
          <button className="btn btn-primary w-full">Save entry</button>
        </form>
        <div className="space-y-4">
          <form action={setStudentBatch} className="card flex gap-2 items-end">
            <input type="hidden" name="id" value={id} />
            <div className="flex-1"><label className="label">Batch</label><select name="batch_id" defaultValue={s.user.batch_id ?? ""} className="input"><option value="">No batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <button className="btn btn-ghost">Save</button>
          </form>
          <div className="card text-sm">
            <h2 className="font-semibold mb-1">Contact and login</h2>
            <p>Parent: {s.user.parent_name} · {s.user.parent_phone}</p><p>Username: {s.user.username}</p>
            <form action={resetStudentPassword} className="mt-3"><input type="hidden" name="id" value={id} /><button className="btn btn-ghost">Reset password</button></form>
          </div>
        </div>
      </div>
    </Shell>
  );
}
