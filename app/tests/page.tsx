import { Shell, studentNav } from "@/components/Shell";
import { TestCard } from "@/components/TestCard";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getStudentTests } from "@/lib/student";

export const dynamic = "force-dynamic";
export default async function Tests() {
  const user = await requireUser("student");
  const tests = await getStudentTests(await getDB(), user.id);
  const groups: [string, typeof tests][] = [
    ["Open now", tests.filter((t) => t.status === "open" || t.status === "in_progress")],
    ["Upcoming", tests.filter((t) => t.status === "upcoming")],
    ["Completed", tests.filter((t) => t.status === "completed")],
    ["Closed", tests.filter((t) => t.status === "missed")],
  ];
  return (
    <Shell user={user} nav={studentNav}>
      <h1 className="text-2xl font-bold mb-4">Your tests</h1>
      {tests.length === 0 && <p className="text-slate">No tests yet. Your mentor will assign them here.</p>}
      {groups.map(([name, list]) => list.length ? (
        <section key={name} className="mb-6">
          <h2 className="text-sm font-semibold text-slate uppercase tracking-wide mb-2">{name}</h2>
          <div className="grid gap-3 sm:grid-cols-2">{list.map((t) => <TestCard key={t.id} t={t} />)}</div>
        </section>
      ) : null)}
    </Shell>
  );
}
