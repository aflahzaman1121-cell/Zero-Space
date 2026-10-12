import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function Index() {
  const u = await getUser();
  if (u) redirect(u.role === "mentor" ? "/mentor" : "/home");
  const db = await getDB();
  const [c] = await db.query(`select count(*)::int as n from users`);
  redirect(c.n === 0 ? "/setup" : "/login");
}
