import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { startAttempt } from "@/lib/service";

export async function POST(req: Request) {
  const u = await apiUser("student");
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { testId } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await startAttempt(await getDB(), u.id, String(testId)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
