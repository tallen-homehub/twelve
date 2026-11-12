"use client";

import { useRef } from "react";
import Link from "next/link";
import { mmss } from "@/lib/format";

export type NoteMoment = {
  t_start: number;
  t_end: number;
  skill: string;
  severity: "red" | "yellow" | "good";
  rep_said: string;
  what_happened: string;
  chase_would_say: string | null;
  why: string;
};

const SEVERITY = {
  good: { label: "Did well", ring: "ring-tan", text: "text-tan" },
  yellow: { label: "Tighten up", ring: "ring-muted", text: "text-muted" },
  red: { label: "Cost you", ring: "ring-red", text: "text-red" },
} as const;

/** A released coaching note: audio player plus a timeline of moments. Tapping a moment plays from 5 seconds before it. */
export function CoachingNoteView({
  audioUrl,
  summary,
  moments,
  skillNames,
  practiceHref,
}: {
  audioUrl: string | null;
  summary: string;
  moments: NoteMoment[];
  skillNames: Record<string, string>;
  practiceHref: string | null;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const play = (t: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = Math.max(0, t - 5);
    void el.play();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-charcoal-2 p-5">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">From Chase</p>
        <p className="mt-2 text-lg">{summary}</p>
      </div>

      {audioUrl ? (
        <audio ref={audio} src={audioUrl} controls preload="metadata" className="w-full" />
      ) : (
        <p className="text-sm text-muted">The audio has been deleted. The notes stay.</p>
      )}

      <ol className="flex flex-col gap-3">
        {moments.map((m, i) => {
          const sev = SEVERITY[m.severity];
          return (
            <li key={i} className={`rounded-2xl bg-charcoal p-5 ring-1 ${sev.ring}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-bold tracking-widest uppercase ${sev.text}`}>
                  {sev.label} · {skillNames[m.skill] ?? (m.skill === "compliance" ? "Honesty" : m.skill)}
                </span>
                {audioUrl && (
                  <button type="button" onClick={() => play(m.t_start)} className="min-h-12 rounded-lg bg-charcoal-2 px-3 font-bold text-tan">
                    ▶ {mmss(m.t_start)}
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-muted">You said: &ldquo;{m.rep_said}&rdquo;</p>
              <p className="mt-2">{m.what_happened}</p>
              {m.chase_would_say && (
                <p className="mt-3 rounded-xl bg-charcoal-2 p-3 italic">
                  <span className="not-italic font-bold text-tan">Say this: </span>&ldquo;{m.chase_would_say}&rdquo;
                </p>
              )}
              <p className="mt-2 text-sm text-muted">{m.why}</p>
            </li>
          );
        })}
      </ol>

      {practiceHref && (
        <Link href={practiceHref} className="flex min-h-12 items-center justify-center rounded-xl bg-tan px-5 py-4 text-lg font-bold text-ink">
          Practice this
        </Link>
      )}
    </div>
  );
}
