"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartButton({ testId, resume, label }: { testId: string; resume?: string | null; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    if (resume) { router.push(`/attempt/${resume}`); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/attempts/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ testId }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Could not start."); setBusy(false); return; }
    router.push(`/attempt/${j.attemptId}`);
  }
  return (
    <div>
      <button onClick={go} disabled={busy} className="btn btn-ignite w-full">{busy ? "Starting…" : label ?? (resume ? "Continue test" : "Start test")}</button>
      {err ? <p role="alert" className="text-sm text-[#B8420F] mt-2">{err}</p> : null}
    </div>
  );
}
