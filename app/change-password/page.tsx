import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function ChangePassword() {
  const u = await getUser();
  if (!u) redirect("/login");
  return (
    <AuthCard title="Set your own password" sub={u.must_change_password ? "Choose a new password before you continue." : "Choose a new password."}>
      <AuthForm endpoint="/api/change-password" submit="Save password" fields={[
        { name: "current", label: "Current password", type: "password", autoComplete: "current-password" },
        { name: "next", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
      ]} />
    </AuthCard>
  );
}
