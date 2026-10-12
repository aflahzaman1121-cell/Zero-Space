import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getAttemptForTake } from "@/lib/service";
import { TestRunner } from "@/components/TestRunner";

export const dynamic = "force-dynamic";
export default async function Attempt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("student");
  let a;
  try { a = await getAttemptForTake(await getDB(), id, user.id); } catch { redirect("/tests"); }
  if (a.submitted) redirect(`/result/${id}`);
  return <TestRunner attemptId={id} title={a.title} deadline={a.deadline} serverNow={a.serverNow} marks={a.marks} negative={a.negative} initialAnswers={a.answers} questions={a.questions} />;
}
