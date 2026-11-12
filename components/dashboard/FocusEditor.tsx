"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFocus, suggestFocus } from "@/app/actions/coaching";

/** This week's focus for a rep: shows it, edits it, and asks the AI for a suggestion. */
export function FocusEditor({ repId, current, lastWeek, canEdit = true }: { repId: string; current: string | null; lastWeek: string | null; canEdit?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(current ?? "");
  const [suggested, setSuggested] = useState<{ focus: string; why: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const suggest = () =>
    start(async () => {
      setMsg(null);
      const r = await suggestFocus(repId);
      if (r.ok && r.value) setSuggested({ focus: r.value, why: r.message });
      else setMsg(r.message);
    });
  const save = (value: string, fromAi?: string) =>
    start(async () => {
      setMsg(null);
      const r = await setFocus(repId, value, fromAi ?? suggested?.focus ?? null);
      if (!r.ok) return setMsg(r.message);
      setEditing(false);
      setSuggested(null);
      router.refresh();
    });

  return (
    <div className="rounded-xl bg-tan/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold tracking-widest text-tan uppercase">{current ? "This week's focus" : lastWeek ? "Last week's focus · set a new one" : "This week's focus"}</p>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="min-h-10 px-2 text-xs font-semibold text-tan">
            {current ? "Edit" : "Set"}
          </button>
        )}
      </div>
      {!editing ? (
        <p className={`mt-1 ${current ? "" : "text-muted"}`}>{current ?? lastWeek ?? "No focus yet."}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            rows={2}
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="One thing they work on this week"
            className="w-full rounded-lg bg-ink px-3 py-2 outline-none ring-tan focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || !text.trim()} onClick={() => save(text)} className="min-h-10 rounded-lg bg-tan px-4 text-sm font-bold text-ink disabled:opacity-40">
              Save
            </button>
            <button type="button" disabled={pending} onClick={suggest} className="min-h-10 rounded-lg bg-charcoal-2 px-4 text-sm font-semibold">
              {pending && !suggested ? "Thinking…" : "✦ Suggest"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-10 px-2 text-sm text-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
      {suggested && (
        <div className="mt-2 rounded-lg bg-ink/60 p-3 text-sm">
          <p className="font-semibold">✦ {suggested.focus}</p>
          {suggested.why && <p className="mt-1 text-muted">{suggested.why}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={pending} onClick={() => save(suggested.focus, suggested.focus)} className="min-h-10 rounded-lg bg-tan px-3 text-xs font-bold text-ink">
              Use it
            </button>
            <button type="button" onClick={() => (setText(suggested.focus), setEditing(true))} className="min-h-10 rounded-lg px-3 text-xs text-tan">
              Edit it
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-red">{msg}</p>}
    </div>
  );
}
