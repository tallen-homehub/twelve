"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mmss } from "@/lib/format";
import type { NoteMoment } from "@/components/CoachingNoteView";
import { Button } from "@/components/ui";
import { rejectNote, releaseNote } from "../actions";

type Note = {
  overall_score: number;
  outcome_guess: string;
  summary: string;
  moments: NoteMoment[];
  per_skill: Record<string, number>;
  practice_next: { skill: string; persona_slug: string | null };
};
type Line = { start: number; who: string; text: string };

const box = "w-full rounded-xl bg-ink px-3 py-3 outline-none ring-tan focus:ring-2";

/** Chase's review screen: audio, transcript that follows playback, and every AI line editable before release. */
export function ReviewEditor({
  noteId,
  draft,
  audioUrl,
  transcript,
  skills,
}: {
  noteId: string;
  draft: Note;
  audioUrl: string | null;
  transcript: Line[];
  skills: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const audio = useRef<HTMLAudioElement>(null);
  const [note, setNote] = useState<Note>(draft);
  const [now, setNow] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const seek = (t: number) => {
    if (!audio.current) return;
    audio.current.currentTime = Math.max(0, t - 5);
    void audio.current.play();
  };
  const setMoment = (i: number, patch: Partial<NoteMoment>) => setNote((n) => ({ ...n, moments: n.moments.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const removeMoment = (i: number) => setNote((n) => ({ ...n, moments: n.moments.filter((_, j) => j !== i) }));
  const addMoment = () => {
    const t = Math.round(audio.current?.currentTime ?? 0);
    const line = [...transcript].reverse().find((l) => l.start <= t && l.who === "Rep");
    setNote((n) => ({
      ...n,
      moments: [...n.moments, { t_start: t, t_end: t + 10, skill: skills[0]?.slug ?? "compliance", severity: "yellow" as const, rep_said: line?.text ?? "", what_happened: "", chase_would_say: "", why: "" }].sort((a, b) => a.t_start - b.t_start),
    }));
  };
  const current = transcript.findLastIndex((l) => l.start <= now);

  const release = () =>
    start(async () => {
      setError(null);
      try {
        const clean = { ...note, moments: note.moments.map((m) => ({ ...m, chase_would_say: m.severity === "good" ? null : m.chase_would_say?.trim() || null })) };
        await releaseNote(noteId, clean);
        router.push("/queue");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't release.");
      }
    });
  const reject = () =>
    start(async () => {
      setError(null);
      try {
        await rejectNote(noteId, reason);
        router.push("/queue");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't reject.");
      }
    });

  return (
    <div className="flex flex-col gap-5 pb-6">
      {audioUrl && (
        <div className="sticky top-0 z-10 -mx-5 bg-ink/95 px-5 py-3 backdrop-blur">
          <audio ref={audio} src={audioUrl} controls preload="metadata" className="w-full" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
        </div>
      )}

      <details className="rounded-2xl bg-charcoal p-4">
        <summary className="cursor-pointer font-semibold">Transcript</summary>
        <ol className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
          {transcript.map((l, i) => (
            <li key={i}>
              <button type="button" onClick={() => seek(l.start + 5)} className={`w-full rounded-lg p-2 text-left ${i === current ? "bg-charcoal-2" : ""}`}>
                <span className="font-bold text-tan">
                  {mmss(l.start)} {l.who}:
                </span>{" "}
                {l.text}
              </button>
            </li>
          ))}
        </ol>
      </details>

      <div className="rounded-2xl bg-charcoal p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Score</p>
          <input
            type="number"
            min={0}
            max={100}
            value={note.overall_score}
            onChange={(e) => setNote({ ...note, overall_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            className="w-24 rounded-xl bg-ink px-3 py-3 text-center font-display text-2xl font-black text-tan"
          />
        </div>
        <p className="mt-4 mb-2 text-xs font-bold tracking-widest text-tan uppercase">Summary (your voice)</p>
        <textarea rows={4} value={note.summary} onChange={(e) => setNote({ ...note, summary: e.target.value })} className={box} />
      </div>

      {note.moments.map((m, i) => (
        <div key={i} className={`flex flex-col gap-3 rounded-2xl bg-charcoal p-4 ring-1 ${m.severity === "red" ? "ring-red" : m.severity === "good" ? "ring-tan" : "ring-muted"}`}>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => seek(m.t_start)} className="min-h-12 rounded-lg bg-charcoal-2 px-3 font-bold text-tan">
              ▶ {mmss(m.t_start)}
            </button>
            <select value={m.severity} onChange={(e) => setMoment(i, { severity: e.target.value as NoteMoment["severity"] })} className="min-h-12 rounded-lg bg-ink px-2">
              <option value="good">Did well</option>
              <option value="yellow">Tighten up</option>
              <option value="red">Cost the deal</option>
            </select>
            <button type="button" onClick={() => removeMoment(i)} className="min-h-12 rounded-lg px-3 text-sm text-muted" aria-label="Delete moment">
              Delete
            </button>
          </div>
          <select value={m.skill} onChange={(e) => setMoment(i, { skill: e.target.value })} className="min-h-12 rounded-lg bg-ink px-2">
            {skills.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
            <option value="compliance">Honesty / compliance</option>
          </select>
          <label className="text-sm text-muted">
            Rep said
            <textarea rows={2} value={m.rep_said} onChange={(e) => setMoment(i, { rep_said: e.target.value })} className={`${box} mt-1 text-bone`} />
          </label>
          <label className="text-sm text-muted">
            What happened
            <textarea rows={2} value={m.what_happened} onChange={(e) => setMoment(i, { what_happened: e.target.value })} className={`${box} mt-1 text-bone`} />
          </label>
          {m.severity !== "good" && (
            <label className="text-sm text-muted">
              Say this instead
              <textarea rows={2} value={m.chase_would_say ?? ""} onChange={(e) => setMoment(i, { chase_would_say: e.target.value })} className={`${box} mt-1 text-bone`} />
            </label>
          )}
          <label className="text-sm text-muted">
            Why
            <textarea rows={2} value={m.why} onChange={(e) => setMoment(i, { why: e.target.value })} className={`${box} mt-1 text-bone`} />
          </label>
        </div>
      ))}

      {audioUrl && (
        <Button variant="ghost" type="button" onClick={addMoment}>
          + Add a moment at {mmss(now)}
        </Button>
      )}

      <Button onClick={release} disabled={pending || note.moments.length === 0}>
        {pending ? "Saving…" : "Approve & send to rep"}
      </Button>
      {!rejecting ? (
        <button type="button" onClick={() => setRejecting(true)} className="min-h-12 text-muted">
          Don&apos;t send this one
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4">
          <textarea rows={2} placeholder="Why not? (bad audio, wrong rep, not a real convo…)" value={reason} onChange={(e) => setReason(e.target.value)} className={box} />
          <Button variant="ghost" onClick={reject} disabled={pending}>
            Reject
          </Button>
        </div>
      )}
      {error && <p className="text-red">{error}</p>}
    </div>
  );
}
