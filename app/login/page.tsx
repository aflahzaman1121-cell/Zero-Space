import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
export default function Login() {
  return (
    <AuthCard title="Welcome back" sub="Sign in with the username your mentor gave you.">
      <AuthForm endpoint="/api/login" submit="Sign in" fields={[{ name: "username", label: "Username", autoComplete: "username" }, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }]} />
    </AuthCard>
  );
}
