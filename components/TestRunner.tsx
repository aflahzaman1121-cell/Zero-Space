"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Q = { id: string; text: string; topic: string; options: { i: number; text: string }[] };
type Props = { attemptId: string; title: string; deadline: string; serverNow: string; marks: number; negative: number; initialAnswers: Record<string, number>; questions: Q[] };

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export function TestRunner(p: Props) {
  const router = useRouter();
  // The countdown is only a display: it is measured against the server clock, and the server enforces the deadline.
  const offset = useRef(new Date(p.serverNow).getTime() - Date.now());
  const deadline = new Date(p.deadline).getTime();
  const [left, setLeft] = useState(() => deadline - (Date.now() + offset.current));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(p.initialAnswers);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<"taking" | "submitting">("taking");
  const [saveNote, setSaveNote] = useState("");
  const answersRef = useRef(answers); answersRef.current = answers;
  const blurs = useRef(0);
  const delta = useRef<Record<string, number>>({});
  const lastTick = useRef(Date.now());
  const idxRef = useRef(0); idxRef.current = idx;
  const dirty = useRef(false);
  const done = useRef(false);

  const flushTime = useCallback(() => {
    const now = Date.now();
    const q = p.questions[idxRef.current];
    if (q) delta.current[q.id] = (delta.current[q.id] ?? 0) + (now - lastTick.current);
    lastTick.current = now;
  }, [p.questions]);

  const save = useCallback(async (final?: "submit") => {
    flushTime();
    const body = { answers: answersRef.current, timeDelta: delta.current, blurs: blurs.current };
    const sentDelta = delta.current, sentBlurs = blurs.current;
    delta.current = {}; blurs.current = 0; dirty.current = false;
    try {
      const r = await fetch(`/api/attempts/${p.attemptId}/${final ?? "save"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "save failed");
      setSaveNote("Saved ✓");
      if (final || j.submitted) { done.current = true; router.replace(`/result/${p.attemptId}`); }
    } catch {
      // Keep unsent time and tab switches so nothing is lost; retry on the next save.
      for (const [k, v] of Object.entries(sentDelta)) delta.current[k] = (delta.current[k] ?? 0) + v;
      blurs.current += sentBlurs; dirty.current = true;
      setSaveNote("Not saved yet. Reconnecting…");
    }
  }, [flushTime, p.attemptId, router]);

  // Countdown and auto-submit at the deadline.
  useEffect(() => {
    const t = setInterval(() => {
      const l = deadline - (Date.now() + offset.current);
      setLeft(l);
      if (l <= 0 && !done.current) { done.current = true; setState("submitting"); void save("submit"); }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, save]);

  // Autosave: shortly after any change, and every 15 seconds as a heartbeat.
  useEffect(() => { if (!dirty.current) return; const t = setTimeout(() => void save(), 600); return () => clearTimeout(t); }, [answers, save]);
  useEffect(() => { const t = setInterval(() => void save(), 15000); return () => clearInterval(t); }, [save]);

  // Count tab switches and window blurs.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") blurs.current += 1; };
    const onBlur = () => { if (document.visibilityState !== "hidden") blurs.current += 1; };
    document.addEventListener("visibilitychange", onHide); window.addEventListener("blur", onBlur);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("blur", onBlur); };
  }, []);

  function choose(qid: string, i: number) { dirty.current = true; setAnswers((a) => ({ ...a, [qid]: i })); }
  function go(n: number) { flushTime(); setIdx(Math.min(Math.max(0, n), p.questions.length - 1)); setConfirming(false); }

  const q = p.questions[idx]!;
  const answered = Object.keys(answers).filter((k) => p.questions.some((x) => x.id === k)).length;
  const urgent = left < 60000;

  if (state === "submitting") return <div className="min-h-screen flex items-center justify-center text-slate">Time is up. Submitting your answers…</div>;
  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-lilac/60">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-sm font-semibold truncate">{p.title}</div><div className="text-xs text-slate">Question {idx + 1} of {p.questions.length} · {answered} answered</div></div>
          <div role="timer" aria-label="Time left" className={`shrink-0 rounded-full px-4 py-2 font-bold text-white ${urgent ? "bg-[#D63A0F]" : "bg-ignite"}`}>⏱ {mmss(left)}</div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3 flex gap-1">
          {p.questions.map((x, k) => <button key={x.id} aria-label={`Go to question ${k + 1}`} onClick={() => go(k)} className={`h-2 flex-1 rounded-full ${k === idx ? "bg-ignite" : answers[x.id] !== undefined ? "bg-blue" : "bg-lilac"}`} />)}
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-5">
        <span className="pill">{q.topic}</span>
        <h2 className="text-lg font-semibold leading-snug mt-3">{q.text}</h2>
        <div className="mt-4 space-y-3" role="radiogroup" aria-label="Answer options">
          {q.options.map((o, k) => {
            const sel = answers[q.id] === o.i;
            return (
              <button key={o.i} role="radio" aria-checked={sel} onClick={() => choose(q.id, o.i)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3.5 min-h-[52px] bg-white transition ${sel ? "border-blue bg-[#EEF0FF]" : "border-lilac hover:border-blue/50"}`}>
                <span className="font-semibold text-slate mr-3">{"ABCD"[k]}</span>{o.text}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate text-center mt-4" aria-live="polite">{saveNote || "Your answers save as you go."}</p>
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-lilac">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-sm text-center">{answered < p.questions.length ? `${p.questions.length - answered} question(s) unanswered. Submit anyway?` : "Submit your test?"}</p>
              <div className="flex gap-3">
                <button className="btn btn-ghost flex-1" onClick={() => setConfirming(false)}>Keep going</button>
                <button className="btn btn-ignite flex-1" onClick={() => { done.current = true; setState("submitting"); void save("submit"); }}>Submit</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</button>
              {idx < p.questions.length - 1
                ? <button className="btn btn-primary flex-1" onClick={() => go(idx + 1)}>Next</button>
                : <button className="btn btn-ignite flex-1" onClick={() => setConfirming(true)}>Finish</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
