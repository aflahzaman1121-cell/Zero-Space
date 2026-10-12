// Optional email alert to the mentor when a student submits. Needs RESEND_API_KEY and a mentor email in Settings.
import type { DB } from "./db";

export async function notifyMentor(db: DB, summary: string, studentName: string, testTitle: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const [s] = await db.query(`select mentor_email from settings where id=1`);
    if (!s?.mentor_email) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM || "zero space <onboarding@resend.dev>", to: [s.mentor_email], subject: `${studentName} finished ${testTitle}`, text: `${studentName} finished ${testTitle}.\n\n${summary}` }),
    });
  } catch { /* an email failure must never block a submission */ }
}
