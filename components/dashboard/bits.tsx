import Link from "next/link";
import type { Need, Numbers, RepRow } from "@/lib/dashboard";

/** Headline number with change vs last week. */
export function Stat({ label, value, last, sub }: { label: string; value: number | string; last?: number; sub?: string }) {
  const n = typeof value === "number" ? value : null;
  const delta = n != null && last != null && last > 0 ? Math.round(((n - last) / last) * 100) : null;
  return (
    <div className="rounded-2xl bg-charcoal p-4">
      <p className="text-xs font-bold tracking-widest text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-4xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">
        {delta != null ? (
          <span className={delta >= 0 ? "text-good" : "text-red"}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs last week
          </span>
        ) : last != null ? (
          `last week ${last}`
        ) : (
          sub
        )}
      </p>
    </div>
  );
}

/** A small "x of y" meter for the coaching pulse. */
export function Meter({ label, n, of }: { label: string; n: number; of: number }) {
  const pct = of ? Math.round((n / of) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-charcoal-2">
        <span className={`block h-full rounded-full ${pct >= 80 ? "bg-good" : pct >= 50 ? "bg-warn" : "bg-red"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 shrink-0 text-right tabular-nums">
        {n}/{of}
      </span>
    </div>
  );
}

const NEED_RING: Record<string, string> = { flag: "ring-red", idle: "ring-red", assessment: "ring-red", falling: "ring-warn" };

/** "Needs you today": one chip per rep, their top reason. */
export function NeedsList({ reps, hrefFor, limit = 12 }: { reps: RepRow[]; hrefFor: (id: string) => string; limit?: number }) {
  const items = reps
    .filter((r) => r.needs.length)
    .sort((a, b) => b.needs[0].weight - a.needs[0].weight || b.needs.length - a.needs.length)
    .slice(0, limit);
  if (!items.length) return <p className="rounded-2xl bg-charcoal p-4 text-muted">Nobody needs you right now. Go knock.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={hrefFor(r.id)} className={`flex min-h-12 items-center gap-2 rounded-xl bg-charcoal px-3 py-2 text-sm ring-1 ${NEED_RING[r.needs[0].kind] ?? "ring-charcoal-2"}`}>
            <span className="font-bold">{r.first}:</span>
            <span>{r.needs[0].text}</span>
            {r.needs.length > 1 && <span className="text-muted">+{r.needs.length - 1}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NeedTags({ needs }: { needs: Need[] }) {
  if (!needs.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {needs.map((n) => (
        <li key={n.kind} className={`rounded-full px-2 py-0.5 text-xs ${NEED_RING[n.kind] ? "bg-red/20 text-bone" : "bg-charcoal-2 text-muted"}`}>
          {n.text}
        </li>
      ))}
    </ul>
  );
}

export function CoachHere({ r }: { r: RepRow }) {
  const tone = r.coachHere.tone === "red" ? "bg-red/25 text-bone" : r.coachHere.tone === "amber" ? "bg-warn/25 text-bone" : "text-muted";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tone}`} title={r.coachHere.detail}>
      {r.coachHere.label}
    </span>
  );
}

export function Trend({ now, last }: { now: number | null; last: number | null }) {
  if (now == null) return <span className="text-muted">–</span>;
  const d = last == null ? 0 : now - last;
  return (
    <span className="tabular-nums">
      {now}
      {last != null && d !== 0 && <span className={`ml-1 text-xs ${d > 0 ? "text-good" : "text-red"}`}>{d > 0 ? "▲" : "▼"}</span>}
    </span>
  );
}

export const relDay = (iso: string | null, today: string) => {
  if (!iso) return "never";
  const d = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

/** The numbers that matter for this rep type. */
export function numbersFor(repType: string | null, n: Numbers) {
  const setter = [
    { k: "doors", label: "Doors", v: n.doors },
    { k: "convos", label: "Convos", v: n.convos },
    { k: "appts", label: "Appts", v: n.appts },
  ];
  const closer = [
    { k: "sits", label: "Sits", v: n.sits },
    { k: "closes", label: "Closes", v: n.closes },
  ];
  return repType === "closer" ? closer : repType === "self_gen" ? [...setter, ...closer] : setter;
}
