import { requireUser } from "./auth";
import { getDB } from "./db";
export async function mentorPage() {
  const user = await requireUser("mentor");
  const db = await getDB();
  const [r] = await db.query(`select count(*)::int as n from attempt_reports where not is_read`);
  return { user, db, unread: (r?.n ?? 0) as number };
}
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
