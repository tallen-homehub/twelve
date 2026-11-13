"use client";

import Link from "next/link";

/** Shared bits for the content editors. Desktop-friendly, still usable on a phone. */
export const inputCls = "w-full rounded-sm border border-charcoal-2 bg-charcoal px-3 py-3 text-base outline-none ring-tan focus:ring-2";

export function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-sm bg-charcoal px-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-tan" />
      <span>{label}</span>
    </label>
  );
}

export function SaveBar({ pending, onSave, msg, viewHref, viewLabel }: { pending: boolean; onSave: () => void; msg: { ok: boolean; text: string } | null; viewHref?: string; viewLabel?: string }) {
  return (
    <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-sm border border-charcoal-2 bg-ink/95 p-3 backdrop-blur">
      <button type="button" disabled={pending} onClick={onSave} className="min-h-12 rounded-sm bg-bone px-6 font-display text-[15px] font-extrabold tracking-[0.28em] text-ink uppercase disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      {viewHref && (
        <Link href={viewHref} className="flex min-h-12 items-center px-2 text-sm font-semibold text-tan">
          {viewLabel ?? "View"} →
        </Link>
      )}
      {msg && <span className={`text-sm ${msg.ok ? "text-good" : "text-red"}`}>{msg.text}</span>}
    </div>
  );
}

export function RowButtons({ onUp, onDown, onRemove }: { onUp?: () => void; onDown?: () => void; onRemove: () => void }) {
  const b = "flex h-10 min-w-10 items-center justify-center rounded-sm bg-charcoal-2 px-2 text-sm disabled:opacity-30";
  return (
    <div className="flex gap-1">
      <button type="button" aria-label="Move up" disabled={!onUp} onClick={onUp} className={b}>
        ↑
      </button>
      <button type="button" aria-label="Move down" disabled={!onDown} onClick={onDown} className={b}>
        ↓
      </button>
      <button type="button" aria-label="Remove" onClick={onRemove} className={`${b} text-red`}>
        ✕
      </button>
    </div>
  );
}

export function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
