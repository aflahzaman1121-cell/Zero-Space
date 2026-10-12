import { Shell, mentorNav } from "@/components/Shell";
import { mentorPage } from "@/lib/mentor";
import { loadWeights } from "@/lib/analytics";
import { demoExists, DEMO_MENTOR, DEMO_STUDENT_PASSWORD } from "@/lib/demo";
import { saveSettings, loadDemoAction, deleteDemoAction } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Settings() {
  const { user, db, unread } = await mentorPage();
  const [w, demo] = await Promise.all([loadWeights(db), demoExists(db)]);
  const demoStudents = demo ? await db.query(`select username from users where is_demo and role='student' order by username`) : [];
  const num = (name: string, label: string, v: number) => <div><label className="label">{label}</label><input name={name} type="number" min={0} max={100} defaultValue={v} className="input" required /></div>;
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <form action={saveSettings} className="card space-y-4 max-w-2xl">
        <h2 className="font-semibold">Readiness score</h2>
        <p className="text-sm text-slate">Weights are relative; they do not need to add up to 100.</p>
        <div className="grid grid-cols-2 gap-3">
          {num("w_recent", "Recent test average", w.w_recent)}{num("w_mastery", "Topic mastery", w.w_mastery)}
          {num("w_consistency", "Consistency", w.w_consistency)}{num("w_trend", "Score trend", w.w_trend)}
        </div>
        {num("low_readiness", "Flag students below this readiness", w.low_readiness)}
        <div><label className="label">Email me when a student finishes a test (optional)</label><input name="mentor_email" type="email" defaultValue={w.mentor_email ?? ""} className="input" /><p className="text-xs text-slate mt-1">Needs RESEND_API_KEY to be set on the server.</p></div>
        <button className="btn btn-primary">Save settings</button>
      </form>
      <section className="card mt-6 max-w-2xl">
        <h2 className="font-semibold">Demo data</h2>
        <p className="text-sm text-slate mb-3">A demo mentor, 3 students and 4 sample tests so you can try everything. Delete it before real students join.</p>
        {demo ? (<>
          <p className="text-sm mb-1">Mentor: <code>{DEMO_MENTOR.username}</code> / <code>{DEMO_MENTOR.password}</code></p>
          <p className="text-sm mb-3">Students: {demoStudents.map((s) => s.username).join(", ")} / <code>{DEMO_STUDENT_PASSWORD}</code></p>
          <form action={deleteDemoAction}><button className="btn btn-ghost">Delete demo data</button></form>
        </>) : <form action={loadDemoAction}><button className="btn btn-primary">Load demo data</button></form>}
      </section>
    </Shell>
  );
}
