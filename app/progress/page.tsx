import { Shell, studentNav } from "@/components/Shell";
import { ProgressCard } from "@/components/ProgressCard";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { first } from "@/lib/mentor";
import { loadBank, loadStudents, loadWeights, type Kind } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export default async function Progress({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("student");
  const db = await getDB();
  const [all, bank, w] = await Promise.all([loadStudents(db, [user.id]), loadBank(db), loadWeights(db)]);
  const s = all.get(user.id)!;
  const kind = (["week", "month", "year"].includes(first(sp.p)) ? first(sp.p) : "week") as Kind;
  return <Shell user={user} nav={studentNav}><ProgressCard name={user.full_name} data={s} bank={bank} weights={w} kind={kind} type={first(sp.type) || "all"} base="/progress" showNotes={false} showFlags={false} /></Shell>;
}
