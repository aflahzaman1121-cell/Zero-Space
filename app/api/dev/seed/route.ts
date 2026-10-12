import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { seedDemo } from "@/lib/demo";

// Development helper only. Disabled in production builds.
export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "1") return NextResponse.json({ error: "Not available" }, { status: 404 });
  return NextResponse.json(await seedDemo(await getDB()));
}
