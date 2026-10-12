import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { setSession, verifyPassword, LOCKOUT } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const uname = String(username ?? "").trim().toLowerCase();
  if (!uname || !password) return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  const db = await getDB();
  const [f] = await db.query(
    `select count(*)::int as n from login_failures where username=$1 and failed_at > now() - ($2 || ' minutes')::interval`,
    [uname, String(LOCKOUT.windowMin)],
  );
  if (f.n >= LOCKOUT.max) return NextResponse.json({ error: `Too many attempts. Try again in ${LOCKOUT.windowMin} minutes.` }, { status: 429 });
  const [u] = await db.query(`select id, password_hash, role, must_change_password from users where username=$1`, [uname]);
  if (!u || !(await verifyPassword(String(password), u.password_hash))) {
    await db.query(`insert into login_failures (username) values ($1)`, [uname]);
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await db.query(`delete from login_failures where username=$1`, [uname]);
  await setSession(u.id);
  return NextResponse.json({ to: u.must_change_password ? "/change-password" : u.role === "mentor" ? "/mentor" : "/home" });
}
