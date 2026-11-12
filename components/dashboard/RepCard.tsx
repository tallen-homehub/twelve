import Link from "next/link";
import type { RepRow } from "@/lib/dashboard";
import { CoachHere, NeedTags, numbersFor, relDay, Trend } from "./bits";
import { FocusEditor } from "./FocusEditor";
import { CoachedButton } from "./CoachedButton";

/** One rep, everything a leader needs at a glance. */
export function RepCard({ r, today, href }: { r: RepRow; today: string; href: string }) {
  const nums = numbersFor(r.repType, r.thisWeek);
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={href} className="font-display text-xl font-black uppercase hover:underline">
            {r.name}
          </Link>
          <p className="text-xs text-muted">
            {r.repType?.replace("_", "-") ?? "rep"} · day {r.day} of {r.totalDays}
            {r.trainingPct != null && ` · ${r.trainingPct}% of training done`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${r.loggedToday ? "bg-good/25 text-bone" : "bg-charcoal-2 text-muted"}`}>{r.loggedToday ? "Logged today" : "Not logged"}</span>
      </header>

      {r.trainingPct != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-charcoal-2">
          <div className={`h-full rounded-full ${r.trainingPct >= 80 ? "bg-good" : r.trainingPct >= 50 ? "bg-warn" : "bg-red"}`} style={{ width: `${r.trainingPct}%` }} />
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
        {nums.map((n) => (
          <div key={n.k} className="rounded-lg bg-ink/50 py-2">
            <dt className="text-[10px] font-bold tracking-widest text-muted uppercase">{n.label}</dt>
            <dd className="font-display text-xl font-black tabular-nums">{n.v}</dd>
          </div>
        ))}
        <div className="rounded-lg bg-ink/50 py-2">
          <dt className="text-[10px] font-bold tracking-widest text-muted uppercase">Practice</dt>
          <dd className="font-display text-xl font-black">
            <Trend now={r.rpAvg} last={r.rpAvgLast} />
          </dd>
        </div>
        {r.recScore != null && (
          <div className="rounded-lg bg-ink/50 py-2">
            <dt className="text-[10px] font-bold tracking-widest text-muted uppercase">Field rec.</dt>
            <dd className="font-display text-xl font-black tabular-nums">{r.recScore}</dd>
          </div>
        )}
      </dl>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">Coach here</span>
        <CoachHere r={r} />
      </div>

      <FocusEditor repId={r.id} current={r.focus?.focus ?? null} lastWeek={r.lastFocus} />
      <NeedTags needs={r.needs.filter((n) => n.kind !== "focus")} />

      <footer className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>Coached {relDay(r.lastCoached, today)}</span>
        <div className="flex items-center gap-1">
          <CoachedButton repId={r.id} compact />
          <Link href={href} className="min-h-10 px-2 py-3 font-semibold text-bone">
            Open →
          </Link>
        </div>
      </footer>
    </article>
  );
}
