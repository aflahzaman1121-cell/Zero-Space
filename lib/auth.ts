import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDB } from "./db";

const COOKIE = "zs_session";
const MAX_AGE = 14 * 24 * 3600;
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s || "dev-only-secret-change-me-please-0123456789");
};

export type User = {
  id: string; username: string; role: "mentor" | "student"; full_name: string; class_level: number | null;
  parent_name: string | null; parent_phone: string | null; batch_id: string | null; must_change_password: boolean;
};

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function setSession(uid: string) {
  const token = await new SignJWT({ uid }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const db = await getDB();
    const [u] = await db.query(
      `select id, username, role, full_name, class_level, parent_name, parent_phone, batch_id, must_change_password from users where id=$1`,
      [payload.uid],
    );
    return (u as User) ?? null;
  } catch { return null; }
}

/** For pages. Redirects unauthenticated users, forces password change, and keeps roles in their own area. */
export async function requireUser(role?: "mentor" | "student"): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.must_change_password) redirect("/change-password");
  if (role && u.role !== role) redirect(u.role === "mentor" ? "/mentor" : "/home");
  return u;
}

/** For API routes. Returns null when not allowed. */
export async function apiUser(role?: "mentor" | "student"): Promise<User | null> {
  const u = await getUser();
  if (!u || (role && u.role !== role)) return null;
  return u;
}

export const LOCKOUT = { max: 5, windowMin: 15 };
