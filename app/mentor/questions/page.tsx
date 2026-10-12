import { Shell, mentorNav } from "@/components/Shell";
import { ImportQuestions } from "@/components/ImportQuestions";
import { mentorPage, first } from "@/lib/mentor";
import { archiveQuestion } from "@/app/actions";

export const dynamic = "force-dynamic";
export default async function Questions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { user, db, unread } = await mentorPage();
  const topic = first(sp.topic);
  const [qs, topics] = await Promise.all([
    db.query(`select id, paper, topic, difficulty, text, archived from questions ${topic ? "where topic=$1" : ""} order by created_at desc limit 300`, topic ? [topic] : []),
    db.query(`select topic, count(*)::int as n from questions where not archived group by topic order by topic`),
  ]);
  return (
    <Shell user={user} nav={mentorNav(unread)}>
      <h1 className="text-2xl font-bold mb-4">Question bank</h1>
      <ImportQuestions />
      <div className="flex flex-wrap gap-2 mt-6 mb-3 text-xs font-semibold">
        <a href="/mentor/questions" className={`px-3 py-1.5 rounded-full ${!topic ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>All topics</a>
        {topics.map((t) => <a key={t.topic} href={`/mentor/questions?topic=${encodeURIComponent(t.topic)}`} className={`px-3 py-1.5 rounded-full ${topic === t.topic ? "bg-ink text-white" : "bg-white text-slate border border-lilac"}`}>{t.topic} ({t.n})</a>)}
      </div>
      <div className="card !p-0">
        {qs.length === 0 && <p className="p-4 text-slate">No questions yet. Import some above.</p>}
        {qs.map((q) => (
          <div key={q.id} className={`flex gap-3 justify-between items-start p-3 border-b last:border-0 border-lilac/50 ${q.archived ? "opacity-50" : ""}`}>
            <div><div className="text-xs text-slate">{q.paper} · {q.topic} · {q.difficulty}{q.archived ? " · archived" : ""}</div><div className="text-sm">{q.text}</div></div>
            <form action={archiveQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-xs font-semibold text-blue whitespace-nowrap">{q.archived ? "Restore" : "Archive"}</button></form>
          </div>))}
      </div>
    </Shell>
  );
}
