import { NextResponse } from "next/server";
import { z } from "zod";
import { getDB } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

const Body = z.object({
  key: z.string().default(""), full_name: z.string().min(2), username: z.string().min(3).regex(/^[a-z0-9._-]+$/i, "Username: letters, numbers, . _ - only"),
  password: z.string().min(8, "Use at least 8 characters."),
});
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const need = process.env.SETUP_KEY;
  if (process.env.NODE_ENV === "production" && !need) return NextResponse.json({ error: "SETUP_KEY is not set on the server." }, { status: 500 });
  if (need && p.data.key !== need) return NextResponse.json({ error: "Wrong setup key." }, { status: 403 });
  const db = await getDB();
  const [c] = await db.query(`select count(*)::int as n from users where role='mentor' and not is_demo`);
  if (c.n > 0) return NextResponse.json({ error: "A mentor account already exists. Sign in instead." }, { status: 409 });
  const [u] = await db.query(
    `insert into users (username, password_hash, role, full_name, must_change_password) values ($1,$2,'mentor',$3,false) returning id`,
    [p.data.username.toLowerCase(), await hashPassword(p.data.password), p.data.full_name],
  );
  await setSession(u.id);
  return NextResponse.json({ to: "/mentor" });
}
