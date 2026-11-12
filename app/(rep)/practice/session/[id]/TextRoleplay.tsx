"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Turn } from "@/lib/roleplay";
import { Button } from "@/components/ui";

export function TextRoleplay({ sessionId, personaName, initialTurns, ended: initiallyEnded }: { sessionId: string; personaName: string; initialTurns: Turn[]; ended: boolean }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(initiallyEnded);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [turns, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy || ended) return;
    setDraft("");
    setError(null);
    setTurns((t) => [...t, { role: "rep", text, t: 0 }]);
    setBusy(true);
    const res = await fetch(`/api/roleplay/${sessionId}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    setTurns((t) => [...t, { role: "homeowner", text: data.reply, t: 0 }]);
    if (data.ended) setEnded(true);
  }

  async function finish() {
    setScoring(true);
    setError(null);
    const res = await fetch(`/api/roleplay/${sessionId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) {
      setScoring(false);
      return setError((await res.json().catch(() => ({}))).error ?? "Scoring failed. Try again.");
    }
    router.push(`/practice/session/${sessionId}/results`);
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Role play · text</p>
          <h1 className="font-display text-2xl font-black uppercase">{personaName}</h1>
        </div>
        <button onClick={finish} disabled={scoring || turns.filter((t) => t.role === "rep").length === 0} className="rounded-xl bg-charcoal px-4 py-3 font-bold disabled:opacity-40">
          End
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 pb-4">
        {turns.map((t, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-3 ${t.role === "rep" ? "self-end bg-tan text-ink" : "self-start bg-charcoal"}`}>
            {t.text}
          </div>
        ))}
        {busy && <div className="self-start rounded-2xl bg-charcoal px-4 py-3 text-muted">…</div>}
        <div ref={bottom} />
      </div>

      {error && <p className="mb-3 rounded-xl bg-red/15 px-4 py-3">{error}</p>}

      {ended || scoring ? (
        <div className="sticky bottom-24 flex flex-col gap-2 bg-ink pt-2">
          <p className="text-center text-sm text-muted">{scoring ? "Scoring on Chase's rubric…" : "The conversation's over."}</p>
          <Button onClick={finish} disabled={scoring}>
            {scoring ? "Scoring…" : "See my score"}
          </Button>
        </div>
      ) : (
        <form onSubmit={send} className="sticky bottom-24 flex gap-2 bg-ink pt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What do you say?"
            autoFocus
            className="min-h-12 flex-1 rounded-xl bg-charcoal px-4 text-lg outline-none ring-tan focus:ring-2"
          />
          <button disabled={busy || !draft.trim()} className="rounded-xl bg-tan px-5 font-bold text-ink disabled:opacity-40">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
