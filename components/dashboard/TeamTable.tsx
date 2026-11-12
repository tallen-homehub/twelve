import Link from "next/link";
import type { Dashboard } from "@/lib/dashboard";
import { CoachHere, relDay, Trend } from "./bits";

/** Every rep in one table. Scrolls sideways on a phone. */
export function TeamTable({ d, hrefFor, editHref, showTeam = true }: { d: Dashboard; hrefFor: (id: string) => string; editHref?: (id: string) => string; showTeam?: boolean }) {
  const pct = (x: number | null) => (x == null ? "–" : `${Math.round(x * 100)}%`);
  const th = "px-3 py-2 text-left text-[11px] font-bold tracking-widest text-muted uppercase whitespace-nowrap";
  const td = "px-3 py-3 whitespace-nowrap tabular-nums";
  const rows = [...d.reps].sort((a, b) => b.thisWeek.appts + b.thisWeek.closes * 3 - (a.thisWeek.appts + a.thisWeek.closes * 3));
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:rounded-sm md:bg-charcoal md:px-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-charcoal-2">
            <th className={th}>Rep</th>
            {showTeam && <th className={th}>Team</th>}
            <th className={th}>Day</th>
            <th className={th}>Training</th>
            <th className={th}>Practice</th>
            <th className={th}>Doors</th>
            <th className={th}>Convos</th>
            <th className={th}>Appts</th>
            <th className={th}>Sits</th>
            <th className={th}>Closes</th>
            <th className={th}>Coached</th>
            <th className={th}>Coach here</th>
            {editHref && <th className={th} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-charcoal-2/60">
              <td className="px-3 py-3 whitespace-nowrap">
                <Link href={hrefFor(r.id)} className="font-semibold hover:underline">
                  {r.name}
                </Link>
                <span className="ml-2 rounded bg-charcoal-2 px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">{r.repType === "closer" ? "C" : r.repType === "self_gen" ? "SG" : "S"}</span>
              </td>
              {showTeam && <td className={`${td} text-muted`}>{r.leaderName ?? "–"}</td>}
              <td className={td}>{r.day}</td>
              <td className={td}>{r.trainingPct == null ? "–" : `${r.trainingPct}%`}</td>
              <td className={td}>
                <Trend now={r.rpAvg} last={r.rpAvgLast} />
              </td>
              <td className={td}>{r.thisWeek.doors || "–"}</td>
              <td className={td}>{r.thisWeek.convos || "–"}</td>
              <td className={td}>{r.thisWeek.appts || "–"}</td>
              <td className={td}>{r.thisWeek.sits || "–"}</td>
              <td className={td}>{r.thisWeek.closes || "–"}</td>
              <td className={`${td} text-muted`}>{relDay(r.lastCoached, d.today)}</td>
              <td className="px-3 py-3">
                <CoachHere r={r} />
              </td>
              {editHref && (
                <td className="px-3 py-1 text-right">
                  <Link href={editHref(r.id)} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-tan">
                    Edit
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-charcoal/60 text-muted">
            <td className="px-3 py-2 text-xs font-bold" colSpan={showTeam ? 4 : 3}>
              Team middle (2 weeks)
            </td>
            <td className={td}>{d.medians.rpAvg ?? "–"}</td>
            <td className={td} colSpan={2}>
              talk {pct(d.medians.convoRate)}
            </td>
            <td className={td}>set {pct(d.medians.setRate)}</td>
            <td className={td} colSpan={2}>
              close {pct(d.medians.closeRate)}
            </td>
            <td colSpan={editHref ? 3 : 2} />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-muted">This week (Mon–today). &ldquo;Coach here&rdquo; is the rate furthest below the team middle, or the weakest practice skill.</p>
    </div>
  );
}
