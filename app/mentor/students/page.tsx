import Link from "next/link";
import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage } from "@/lib/mentor";
import { createStudent, createBatch, tempPassword } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Students() {
  const { user, db, unread } = await mentorPage();
  const [students, batches, pw] = await Promise.all([
    db.query(`select u.id, u.full_name, u.username, u.class_level, b.name as batch from users u left join batches b on b.id=u.batch_id where u.role='student' order by u.full_name`),
    db.query(`select id, name from batches order by name`), tempPassword(),
  ]);
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <h1 className="text-2xl font-bold mb-4">Students</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <form action={createStudent} className="card space-y-3">
          <h2 className="font-semibold">Add a student</h2>
          <div><label className="label">Full name</label><input name="full_name" className="input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Username</label><input name="username" className="input" autoCapitalize="none" required /></div>
            <div><label className="label">Temporary password</label><input name="password" defaultValue={pw} className="input font-mono" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Class</label><select name="class_level" className="input"><option>11</option><option>12</option></select></div>
            <div><label className="label">Batch</label><select name="batch_id" className="input"><option value="">No batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Parent name</label><input name="parent_name" className="input" required /></div>
            <div><label className="label">Parent phone</label><input name="parent_phone" inputMode="tel" className="input" required /></div>
          </div>
          <button className="btn btn-primary w-full">Create student</button>
          <p className="text-xs text-slate">The student must change the password at first login. Share the username and password with them yourself.</p>
        </form>
        <div className="space-y-4">
          <form action={createBatch} className="card flex gap-2 items-end">
            <div className="flex-1"><label className="label">New batch</label><input name="name" className="input" placeholder="e.g. Class 11 · Oct 2026" required /></div>
            <button className="btn btn-primary">Add</button>
          </form>
          <div className="card !p-0">
            {students.length === 0 && <p className="p-4 text-slate">No students yet.</p>}
            {students.map((s) => <Link key={s.id} href={`/mentor/students/${s.id}`} className="flex justify-between p-3 border-b last:border-0 border-lilac/50 hover:bg-lilac/20"><span><b>{s.full_name}</b><span className="block text-xs text-slate">{s.username} · Class {s.class_level}</span></span><span className="text-xs text-slate self-center">{s.batch ?? "No batch"}</span></Link>)}
          </div>
        </div>
      </div>
    </Shell>
  );
}
