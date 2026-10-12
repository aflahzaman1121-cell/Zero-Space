import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { saveProgress } from "@/lib/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await apiUser("student");
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await saveProgress(await getDB(), u.id, { attemptId: id, answers: b.answers ?? {}, timeDelta: b.timeDelta ?? {}, blurs: Number(b.blurs) || 0 }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
