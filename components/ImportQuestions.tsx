"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseInput, csvTemplate } from "@/lib/import";

export function ImportQuestions() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fmt, setFmt] = useState<"csv" | "json">("csv");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = text.trim() ? parseInput(text, fmt) : null;
  const good = parsed?.rows.filter((r) => r.ok).length ?? 0, bad = parsed?.rows.filter((r) => !r.ok) ?? [];
  function download() {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csvTemplate()], { type: "text/csv" })); a.download = "zero-space-questions-template.csv"; a.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setText(await f.text()); setFmt(f.name.toLowerCase().endsWith(".json") ? "json" : "csv");
  }
  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/questions/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, format: fmt }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error ?? "Import failed." });
    setMsg({ ok: true, t: `Imported ${j.imported} question(s).` }); setText(""); router.refresh();
  }
  return (
    <div className="card">
      <h2 className="font-semibold">Import questions</h2>
      <p className="text-sm text-slate mb-3">Every wrong option needs a misconception tag. That is how reports show where a student went wrong. Nothing is saved until every row is valid.</p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={download} className="btn btn-ghost">Download CSV template</button>
        <label className="btn btn-ghost cursor-pointer">Choose file<input type="file" accept=".csv,.json" onChange={onFile} className="hidden" /></label>
        <select value={fmt} onChange={(e) => setFmt(e.target.value as "csv" | "json")} className="input !w-auto" aria-label="Format"><option value="csv">CSV</option><option value="json">JSON</option></select>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="input !py-3 font-mono text-sm" placeholder="Paste CSV or JSON here, or choose a file" />
      {parsed?.fatal && <p className="text-sm text-[#B8420F] font-medium mt-2">{parsed.fatal}</p>}
      {parsed && !parsed.fatal && (
        <div className="mt-3 text-sm">
          <p><b className="text-[#17693A]">{good} valid</b>{bad.length ? <> · <b className="text-[#B8420F]">{bad.length} with problems</b></> : null}</p>
          <ul className="mt-2 space-y-1 max-h-48 overflow-auto">{bad.map((b) => <li key={b.row} className="text-[#B8420F]">Row {b.row}: {b.errors.join("; ")}</li>)}</ul>
        </div>
      )}
      {msg && <p className={`text-sm font-medium mt-2 ${msg.ok ? "text-[#17693A]" : "text-[#B8420F]"}`}>{msg.t}</p>}
      <button disabled={busy || !parsed || !!parsed.fatal || bad.length > 0 || good === 0} onClick={save} className="btn btn-primary mt-3">{busy ? "Importing…" : `Import ${good || ""} question${good === 1 ? "" : "s"}`}</button>
    </div>
  );
}
