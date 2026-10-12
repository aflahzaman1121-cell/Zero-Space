"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string; required?: boolean };
export function AuthForm({ endpoint, fields, submit }: { endpoint: string; fields: Field[]; submit: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Something went wrong."); setBusy(false); return; }
    router.push(j.to ?? "/"); router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required={f.required !== false} className="input" autoCapitalize="none" />
          {f.hint ? <p className="text-xs text-slate mt-1">{f.hint}</p> : null}
        </div>
      ))}
      {err ? <p role="alert" className="text-sm text-[#B8420F] font-medium">{err}</p> : null}
      <button disabled={busy} className="btn btn-primary w-full">{busy ? "Please wait…" : submit}</button>
    </form>
  );
}
