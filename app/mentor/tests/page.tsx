import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage } from "@/lib/mentor";
import { fmtDate, TYPE_LABEL } from "@/lib/student";
import { createTest } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Tests() {
  const { user, db, unread } = await mentorPage();
  const [qs, batches, students, tests] = await Promise.all([
    db.query(`select id, paper, topic, text from questions where not archived order by paper, topic, created_at`),
    db.query(`select id, name from batches order by name`),
    db.query(`select id, full_name from users where role='student' order by full_name`),
    db.query(`select t.id, t.title, t.type, t.paper, t.opens_at, t.closes_at, (select count(*)::int from test_questions where test_id=t.id) as nq, (select count(*)::int from test_assignments where test_id=t.id) as na, (select count(*)::int from attempts a where a.test_id=t.id and a.submitted_at is not null) as nd from tests t order by t.opens_at desc limit 50`),
  ]);
  const byTopic = new Map<string, typeof qs>();
  for (const q of qs) { const k = `${q.paper} · ${q.topic}`; byTopic.set(k, [...(byTopic.get(k) ?? []), q]); }
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <h1 className="text-2xl font-bold mb-4">Tests</h1>
      <form action={createTest} className="card space-y-4">
        <h2 className="font-semibold">Create a timed test</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><label className="label">Title</label><input name="title" className="input" required /></div>
          <div><label className="label">Type</label><select name="type" className="input">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Paper</label><input name="paper" defaultValue="MA" className="input" required /></div>
          <div><label className="label">Time limit (minutes)</label><input name="time_limit_min" type="number" defaultValue={30} className="input" required /></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="label">Marks each</label><input name="marks" type="number" step="0.25" defaultValue={1} className="input" /></div><div><label className="label">Negative</label><input name="negative" type="number" step="0.25" defaultValue={0} className="input" /></div></div>
          <div><label className="label">Opens (IST)</label><input name="opens_at" type="datetime-local" className="input" required /></div>
          <div><label className="label">Closes (IST)</label><input name="closes_at" type="datetime-local" className="input" required /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <fieldset><legend className="label">Assign to batches</legend>{batches.length === 0 && <p className="text-xs text-slate">No batches yet.</p>}{batches.map((b) => <label key={b.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="batch_ids" value={b.id} className="w-4 h-4" />{b.name}</label>)}</fieldset>
          <fieldset><legend className="label">Or individual students</legend>{students.map((s) => <label key={s.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="student_ids" value={s.id} className="w-4 h-4" />{s.full_name}</label>)}</fieldset>
        </div>
        <fieldset><legend className="label">Questions</legend>
          {qs.length === 0 && <p className="text-sm text-slate">Import questions first.</p>}
          <div className="max-h-72 overflow-auto rounded-xl border-2 border-lilac p-3 space-y-3">{[...byTopic].map(([k, list]) => (
            <div key={k}><div className="text-xs font-semibold text-slate mb-1">{k}</div>{list.map((q) => <label key={q.id} className="flex items-start gap-2 py-1 text-sm"><input type="checkbox" name="question_ids" value={q.id} className="w-4 h-4 mt-1" /><span>{q.text}</span></label>)}</div>))}</div>
        </fieldset>
        <button className="btn btn-primary w-full sm:w-auto">Create test</button>
      </form>
      <h2 className="font-semibold mt-8 mb-3">Existing tests</h2>
      <div className="card !p-0">{tests.length === 0 && <p className="p-4 text-slate">None yet.</p>}
        {tests.map((t) => <div key={t.id} className="p-3 border-b last:border-0 border-lilac/50 text-sm"><b>{t.title}</b> <span className="pill ml-1">{TYPE_LABEL[t.type]}</span><div className="text-xs text-slate mt-1">{t.paper} · {t.nq} questions · {fmtDate(new Date(t.opens_at).toISOString())} to {fmtDate(new Date(t.closes_at).toISOString())} · {t.nd}/{t.na} submitted</div></div>)}</div>
    </Shell>
  );
}
