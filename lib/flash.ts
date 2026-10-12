import { cookies } from "next/headers";
export async function setFlash(kind: "ok" | "error", msg: string) {
  (await cookies()).set("zs_flash", JSON.stringify({ kind, msg }), { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 });
}
export async function getFlash(): Promise<{ kind: "ok" | "error"; msg: string } | null> {
  const v = (await cookies()).get("zs_flash")?.value;
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}
