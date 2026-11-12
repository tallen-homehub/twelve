"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDailyLog } from "@/app/actions/coaching";

type Vals = { doors: number; convos: number; appts: number; sits: number; closes: number; note: string };
const FIELDS = {
  doors: "Doors",
  convos: "Convos",
  appts: "Appts set",
  sits: "Sits",
  closes: "Closes",
} as const;

/** End-of-day numbers. Setters: doors, convos, appts. Closers: sits, closes. Self-gen: all five. */
export function DailyLog({ repType, today, yesterday, saved }: { repType: string | null; today: string; yesterday: string; saved: Record<string, Vals> }) {
  const router = useRouter();
  const keys = (repType === "closer" ? ["sits", "closes"] : repType === "self_gen" ? ["doors", "convos", "appts", "sits", "closes"] : ["doors", "convos", "appts"]) as (keyof typeof FIELDS)[];
  const [date, setDate] = useState(today);
  const blank: Vals = { doors: 0, convos: 0, appts: 0, sits: 0, closes: 0, note: "" };
  const [vals, setVals] = useState<Vals>(saved[today] ?? blank);
  const [open, setOpen] = useState(!saved[today]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const done = Boolean(saved[today]);

  const pick = (d: string) => {
    setDate(d);
    setVals(saved[d] ?? blank);
    setMsg(null);
  };
  const bump = (k: keyof typeof FIELDS, by: number) => setVals((v) => ({ ...v, [k]: Math.max(0, (v[k] as number) + by) }));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-charcoal px-4 py-3 text-left">
        <span>
          <span className="text-xs font-bold tracking-widest text-tan uppercase">Today&apos;s numbers ✓</span>
          <span className="mt-1 block text-sm text-muted">{keys.map((k) => `${saved[today]?.[k] ?? 0} ${FIELDS[k].toLowerCase()}`).join(" · ")}</span>
        </span>
        <span className="text-sm font-semibold text-tan">Edit</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">{done && date === today ? "Today's numbers" : "Log your numbers"}</p>
        <div className="flex rounded-lg bg-ink p-1 text-xs">
          {[
            [today, "Today"],
            [yesterday, "Yesterday"],
          ].map(([d, label]) => (
            <button key={d} type="button" onClick={() => pick(d)} className={`min-h-9 rounded-md px-3 ${date === d ? "bg-charcoal-2 font-bold" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keys.map((k) => (
          <div key={k} className="flex flex-col gap-1 rounded-xl bg-ink/60 p-2">
            <span className="text-center text-[11px] font-bold tracking-widest text-muted uppercase">{FIELDS[k]}</span>
            <div className="flex items-center justify-between gap-1">
              <button type="button" aria-label={`Less ${FIELDS[k]}`} onClick={() => bump(k, -1)} className="h-12 w-12 rounded-lg bg-charcoal-2 text-xl font-bold">
                −
              </button>
              <input
                inputMode="numeric"
                value={vals[k]}
                onChange={(e) => setVals((v) => ({ ...v, [k]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                className="w-14 bg-transparent text-center font-display text-2xl font-black outline-none"
                aria-label={FIELDS[k]}
              />
              <button type="button" aria-label={`More ${FIELDS[k]}`} onClick={() => bump(k, 1)} className="h-12 w-12 rounded-lg bg-charcoal-2 text-xl font-bold">
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <input
        value={vals.note}
        onChange={(e) => setVals((v) => ({ ...v, note: e.target.value }))}
        maxLength={280}
        placeholder="One line on the day (optional)"
        className="min-h-12 rounded-xl bg-ink/60 px-4 outline-none ring-tan focus:ring-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveDailyLog({ date, ...vals });
              setMsg({ ok: r.ok, text: r.message });
              if (r.ok) {
                router.refresh();
                if (date === today) setOpen(false);
              }
            })
          }
          className="min-h-12 flex-1 rounded-xl bg-tan px-5 text-lg font-bold text-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save numbers"}
        </button>
        {done && (
          <button type="button" onClick={() => setOpen(false)} className="min-h-12 px-3 text-muted">
            Close
          </button>
        )}
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-red"}`}>{msg.text}</p>}
    </div>
  );
}
