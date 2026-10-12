import Link from "next/link";
import { Shell, studentNav } from "@/components/Shell";
import { TestCard } from "@/components/TestCard";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getStudentTests } from "@/lib/student";

export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await requireUser("student");
  const tests = await getStudentTests(await getDB(), user.id);
  const open = tests.filter((t) => t.status === "open" || t.status === "in_progress");
  const recent = tests.filter((t) => t.status === "completed").slice(0, 3);
  return (
    <Shell user={user} nav={studentNav}>
      <h1 className="text-2xl font-bold">Hi {user.full_name.split(" ")[0]} 👋</h1>
      <p className="text-slate mb-4">Start where you are. One test at a time.</p>
      <h2 className="text-sm font-semibold text-slate uppercase tracking-wide mb-2">Open now</h2>
      {open.length ? <div className="grid gap-3 sm:grid-cols-2">{open.map((t) => <TestCard key={t.id} t={t} />)}</div> : <p className="card text-slate">Nothing open right now. Check back soon.</p>}
      {recent.length > 0 && (<>
        <h2 className="text-sm font-semibold text-slate uppercase tracking-wide mt-6 mb-2">Recent results</h2>
        <div className="grid gap-3 sm:grid-cols-2">{recent.map((t) => <TestCard key={t.id} t={t} />)}</div>
        <Link href="/tests" className="inline-block mt-3 text-blue font-medium">All tests →</Link>
      </>)}
    </Shell>
  );
}
