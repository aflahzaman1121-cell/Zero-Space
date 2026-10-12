"use server";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, hashPassword } from "@/lib/auth";
import { getDB, type DB } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { seedDemo, deleteDemo } from "@/lib/demo";
import { loadBank, loadStudents, loadWeights, range, rollup, prevRange, readiness } from "@/lib/analytics";
import { factsFrom, wording } from "@/lib/reports";

const mentor = () => requireUser("mentor");
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = async (path: string, kind: "ok" | "error", msg: string): Promise<never> => { await setFlash(kind, msg); revalidatePath(path); redirect(path); };
// Form times are entered in Indian time.
const istDate = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
const ist = (v: string) => new Date(v.length === 16 ? `${v}:00+05:30` : v);

export async function tempPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789";
  const pick = (s: string) => s[randomInt(s.length)]!;
  return Array.from({ length: 5 }, () => pick(a)).join("") + Array.from({ length: 3 }, () => pick(d)).join("");
}

/** Gives a student every test already assigned to their batch that is still open or upcoming. */
async function applyBatchTests(db: DB, studentId: string, batchId: string | null) {
  if (!batchId) return;
  await db.query(
    `insert into test_assignments (test_id, student_id) select tb.test_id, $1 from test_batches tb join tests t on t.id=tb.test_id where tb.batch_id=$2 and t.closes_at > now() on conflict do nothing`,
    [studentId, batchId],
  );
}

export async function createStudent(f: FormData) {
  await mentor();
  const P = z.object({
    full_name: z.string().min(2, "Enter the student's name"), username: z.string().min(3, "Username needs 3+ characters").regex(/^[a-z0-9._-]+$/i, "Username: letters, numbers, . _ - only"),
    password: z.string().min(8, "Temporary password needs 8+ characters"), class_level: z.coerce.number().int().min(11).max(12), parent_name: z.string().min(2, "Enter the parent's name"), parent_phone: z.string().min(8, "Enter the parent's phone number"),
  }).safeParse(Object.fromEntries(f.entries()));
  if (!P.success) return back("/mentor/students", "error", P.error.issues[0]!.message);
  const db = await getDB();
  const batch = str(f, "batch_id") || null;
  try {
    const [u] = await db.query(
      `insert into users (username, password_hash, role, full_name, class_level, parent_name, parent_phone, batch_id, must_change_password) values ($1,$2,'student',$3,$4,$5,$6,$7,true) returning id`,
      [P.data.username.toLowerCase(), await hashPassword(P.data.password), P.data.full_name, P.data.class_level, P.data.parent_name, P.data.parent_phone, batch],
    );
    await applyBatchTests(db, u.id, batch);
  } catch (e) {
    return back("/mentor/students", "error", /unique|duplicate/i.test((e as Error).message) ? "That username is taken." : "Could not create the student.");
  }
  return back("/mentor/students", "ok", `Created ${P.data.full_name}. Username: ${P.data.username.toLowerCase()} · temporary password: ${P.data.password} (they must change it at first login).`);
}

export async function resetStudentPassword(f: FormData) {
  await mentor();
  const id = str(f, "id"), pw = await tempPassword();
  const db = await getDB();
  const rows = await db.query(`update users set password_hash=$2, must_change_password=true where id=$1 and role='student' returning username`, [id, await hashPassword(pw)]);
  await db.query(`delete from login_failures where username=$1`, [rows[0]?.username ?? ""]);
  return back(`/mentor/students/${id}`, "ok", `New temporary password for ${rows[0]?.username}: ${pw}`);
}

export async function createBatch(f: FormData) {
  await mentor();
  const name = str(f, "name");
  if (name.length < 2) return back("/mentor/students", "error", "Enter a batch name.");
  await (await getDB()).query(`insert into batches (name) values ($1)`, [name]);
  return back("/mentor/students", "ok", `Batch "${name}" created.`);
}

export async function setStudentBatch(f: FormData) {
  await mentor();
  const id = str(f, "id"), batch = str(f, "batch_id") || null;
  const db = await getDB();
  await db.query(`update users set batch_id=$2 where id=$1 and role='student'`, [id, batch]);
  await applyBatchTests(db, id, batch);
  return back(`/mentor/students/${id}`, "ok", "Batch updated.");
}

export async function addEntry(f: FormData) {
  await mentor();
  const id = str(f, "student_id"), kind = str(f, "kind");
  if (!["practice", "video", "note"].includes(kind)) return back(`/mentor/students/${id}`, "error", "Choose an entry type.");
  const v = str(f, "value"), note = str(f, "note");
  if (kind !== "note" && !v) return back(`/mentor/students/${id}`, "error", "Enter a number.");
  if (kind === "note" && !note) return back(`/mentor/students/${id}`, "error", "Write the note.");
  if (kind === "video" && (Number(v) < 0 || Number(v) > 100)) return back(`/mentor/students/${id}`, "error", "Video completion is a percentage from 0 to 100.");
  await (await getDB()).query(`insert into manual_entries (student_id, kind, value, note, entry_date) values ($1,$2,$3,$4,$5)`, [id, kind, kind === "note" ? null : Number(v), note || null, str(f, "entry_date") || new Date().toISOString().slice(0, 10)]);
  return back(`/mentor/students/${id}`, "ok", "Entry saved.");
}

export async function createTest(f: FormData) {
  await mentor();
  const P = z.object({
    title: z.string().min(3, "Give the test a title"), paper: z.string().min(2), type: z.enum(["quiz", "weekly", "module", "practice", "mock"]),
    time_limit_min: z.coerce.number().int().min(1, "Time limit must be at least 1 minute").max(300), marks: z.coerce.number().min(0.25), negative: z.coerce.number().min(0).max(5),
  }).safeParse(Object.fromEntries(f.entries()));
  if (!P.success) return back("/mentor/tests", "error", P.error.issues[0]!.message);
  const opens = ist(str(f, "opens_at")), closes = ist(str(f, "closes_at"));
  if (isNaN(+opens) || isNaN(+closes)) return back("/mentor/tests", "error", "Set when the test opens and closes.");
  if (closes <= opens) return back("/mentor/tests", "error", "The test must close after it opens.");
  const qids = f.getAll("question_ids").map(String), batches = f.getAll("batch_ids").map(String), students = f.getAll("student_ids").map(String);
  if (!qids.length) return back("/mentor/tests", "error", "Pick at least one question.");
  if (!batches.length && !students.length) return back("/mentor/tests", "error", "Assign the test to a batch or to students.");
  const db = await getDB();
  await db.tx(async (t) => {
    const [row] = await t.query(`insert into tests (title, paper, type, time_limit_min, opens_at, closes_at, marks, negative) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [P.data.title, P.data.paper.toUpperCase(), P.data.type, P.data.time_limit_min, opens.toISOString(), closes.toISOString(), P.data.marks, P.data.negative]);
    for (const q of qids) await t.query(`insert into test_questions (test_id, question_id) values ($1,$2) on conflict do nothing`, [row.id, q]);
    for (const b of batches) {
      await t.query(`insert into test_batches (test_id, batch_id) values ($1,$2) on conflict do nothing`, [row.id, b]);
      await t.query(`insert into test_assignments (test_id, student_id) select $1, id from users where batch_id=$2 and role='student' on conflict do nothing`, [row.id, b]);
    }
    for (const s of students) await t.query(`insert into test_assignments (test_id, student_id) values ($1,$2) on conflict do nothing`, [row.id, s]);
  });
  return back("/mentor/tests", "ok", `Test "${P.data.title}" created.`);
}

export async function saveSettings(f: FormData) {
  await mentor();
  const n = (k: string) => Number(str(f, k));
  const w = [n("w_recent"), n("w_mastery"), n("w_consistency"), n("w_trend")];
  if (w.some((x) => isNaN(x) || x < 0 || x > 100) || w.reduce((a, b) => a + b, 0) <= 0) return back("/mentor/settings", "error", "Weights must be between 0 and 100 and not all zero.");
  const low = n("low_readiness");
  if (isNaN(low) || low < 0 || low > 100) return back("/mentor/settings", "error", "Low-readiness threshold must be 0 to 100.");
  const email = str(f, "mentor_email") || null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return back("/mentor/settings", "error", "That email address does not look right.");
  await (await getDB()).query(`update settings set w_recent=$1, w_mastery=$2, w_consistency=$3, w_trend=$4, low_readiness=$5, mentor_email=$6 where id=1`, [...w, low, email]);
  return back("/mentor/settings", "ok", "Settings saved.");
}

export async function markRead(f: FormData) {
  await mentor();
  await (await getDB()).query(`update attempt_reports set is_read=true where id=$1`, [str(f, "id")]);
  revalidatePath("/mentor/inbox");
}
export async function markAllRead() {
  await mentor();
  await (await getDB()).query(`update attempt_reports set is_read=true where not is_read`);
  revalidatePath("/mentor/inbox");
}

export async function archiveQuestion(f: FormData) {
  await mentor();
  await (await getDB()).query(`update questions set archived = not archived where id=$1`, [str(f, "id")]);
  revalidatePath("/mentor/questions");
}

export async function generateParentReports(f: FormData) {
  await mentor();
  const db = await getDB();
  const weekStart = range("week", new Date(str(f, "week") || Date.now())).start;
  const now = new Date();
  const [all, bank, w] = await Promise.all([loadStudents(db), loadBank(db), loadWeights(db)]);
  const label = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} to ${new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`;
  let made = 0;
  for (const s of all.values()) {
    const cur = rollup(s, "week", weekStart, "all", now);
    const ready = readiness(s, bank, w, now);
    const openTests = s.assigned.filter((t) => t.opensAt <= now && t.closesAt > now && !s.attempts.some((a) => a.testId === t.id)).length;
    const body = wording(factsFrom(s.user.full_name, s.user.parent_name, label, cur, ready, openTests));
    const r = await db.query(`insert into parent_reports (student_id, week_start, body) values ($1,$2,$3) on conflict (student_id, week_start) do nothing returning id`, [s.user.id, istDate(weekStart), body]);
    made += r.length;
  }
  return back(`/mentor/parents?week=${istDate(weekStart)}`, "ok", made ? `Created ${made} draft message(s). Existing drafts were left alone.` : "All drafts for this week already exist.");
}

export async function saveParentReport(f: FormData) {
  await mentor();
  const id = str(f, "id"), week = str(f, "week");
  const intent = str(f, "intent"), status = intent === "approve" ? "approved" : intent === "draft" ? "draft" : null;
  const db = await getDB();
  if (status) await db.query(`update parent_reports set body=$2, status=$3, updated_at=now() where id=$1`, [id, String(f.get("body") ?? ""), status]);
  else await db.query(`update parent_reports set body=$2, updated_at=now() where id=$1`, [id, String(f.get("body") ?? "")]);
  return back(`/mentor/parents?week=${week}`, "ok", status === "approved" ? "Approved. Copy it and send it yourself." : "Saved.");
}

export async function loadDemoAction() { await mentor(); const r = await seedDemo(await getDB()); return back("/mentor/settings", "ok", r.skipped ? "Demo data is already loaded." : "Demo data loaded. Demo logins are listed below."); }
export async function deleteDemoAction() { await mentor(); await deleteDemo(await getDB()); return back("/mentor/settings", "ok", "Demo data deleted."); }
