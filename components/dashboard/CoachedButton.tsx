"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markCoached } from "@/app/actions/coaching";

const KINDS = [
  { v: "1on1", label: "1:1" },
  { v: "ride_along", label: "Ride-along" },
  { v: "call", label: "Call" },
  { v: "other", label: "Other" },
];

/** "Mark coached": logs a touch so the dashboards know this rep got time. */
export function CoachedButton({ repId, compact = false }: { repId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("1on1");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`min-h-10 rounded-lg font-semibold text-tan ${compact ? "px-2 text-xs" : "bg-charcoal-2 px-4 text-sm"}`}>
        ✓ Mark coached
      </button>
    );
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-charcoal-2 p-3">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k.v} type="button" onClick={() => setKind(k.v)} className={`min-h-10 rounded-lg px-3 text-sm ${kind === k.v ? "bg-tan font-bold text-ink" : "bg-ink"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Quick note (optional)" className="min-h-10 rounded-lg bg-ink px-3 outline-none ring-tan focus:ring-2" />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await markCoached(repId, kind, note);
              if (!r.ok) return setMsg(r.message);
              setOpen(false);
              setNote("");
              router.refresh();
            })
          }
          className="min-h-10 rounded-lg bg-tan px-4 text-sm font-bold text-ink"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-10 px-2 text-sm text-muted">
          Cancel
        </button>
      </div>
      {msg && <p className="text-sm text-red">{msg}</p>}
    </div>
  );
}
