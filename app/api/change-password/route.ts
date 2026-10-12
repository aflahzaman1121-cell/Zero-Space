import { NextResponse } from "next/server";
import { z } from "zod";
import { getDB } from "@/lib/db";
import { getUser, hashPassword, verifyPassword } from "@/lib/auth";

const Body = z.object({ current: z.string().min(1), next: z.string().min(8, "Use at least 8 characters.").max(100) });
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const db = await getDB();
  const [row] = await db.query(`select password_hash from users where id=$1`, [u.id]);
  if (!(await verifyPassword(p.data.current, row.password_hash))) return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  if (p.data.current === p.data.next) return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  await db.query(`update users set password_hash=$2, must_change_password=false where id=$1`, [u.id, await hashPassword(p.data.next)]);
  return NextResponse.json({ to: u.role === "mentor" ? "/mentor" : "/home" });
}
