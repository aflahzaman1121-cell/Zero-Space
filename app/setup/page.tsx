import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getDB } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Setup() {
  const db = await getDB();
  const [c] = await db.query(`select count(*)::int as n from users where role='mentor' and not is_demo`);
  if (c.n > 0) redirect("/login");
  return (
    <AuthCard title="Create the mentor account" sub="One-time setup. This account can create students, tests and reports.">
      <AuthForm endpoint="/api/setup" submit="Create account" fields={[
        { name: "key", label: "Setup key", type: "password", required: false, hint: "The SETUP_KEY you set in Vercel. Leave blank when testing locally." },
        { name: "full_name", label: "Your name" },
        { name: "username", label: "Username", autoComplete: "username" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
      ]} />
    </AuthCard>
  );
}
