import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, loadDashboard } from "@/lib/dashboard";
import { mmss } from "@/lib/format";
import { REP_STATUS } from "@/lib/recording-status";
import { Card } from "@/components/ui";
import { RepCard } from "./RepCard";
import { CoachedButton } from "./CoachedButton";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
const KIND: Record<string, string> = { "1on1": "1:1", ride_along: "Ride-along", call: "Call", other: "Other" };

/** The screen to open before a 1:1. Staff see any rep; a team leader sees their own (RLS). */
export async function RepDetail({ repId, backHref, backLabel, staff, messageAction }: { repId: string; backHref: string; backLabel: string; staff: boolean; messageAction?: (fd: FormData) => Promise<void> }) {
  const d = await loadDashboard();
  const r = d.reps.find((x) => x.id === repId);
  if (!r) notFound();
  const supabase = await createClient();
  const since = addDays(d.today, -13);
  const [{ data: logs }, { data: sessions }, { data: recs }, { data: touches }, { data: focus }, { data: flags }] = await Promise.all([
    supabase.from("daily_logs").select("log_date, doors, convos, appts, sits, closes, note").eq("profile_id", repId).gte("log_date", since).order("log_date", { ascending: false }),
    supabase.from("roleplay_sessions").select("id, started_at, mode, status, persona:personas(name), score:roleplay_scores(overall)").eq("profile_id", repId).order("started_at", { ascending: false }).limit(8),
    supabase.from("recordings").select("id, label, setting, status, duration_s, created_at").eq("profile_id", repId).order("created_at", { ascending: false }).limit(6),
    supabase.from("coaching_touches").select("kind, note, created_at, coach:profiles!coaching_touches_coach_id_fkey(full_name)").eq("profile_id", repId).order("created_at", { ascending: false }).limit(8),
    supabase.from("weekly_focus").select("week_start, focus").eq("profile_id", repId).order("week_start", { ascending: false }).limit(6),
    supabase.from("flags").select("severity, note, created_at, source_type").eq("profile_id", repId).gte("created_at", `${addDays(d.today, -14)}T00:00:00Z`).order("created_at", { ascending: false }).limit(8),
  ]);
  const setter = r.repType !== "closer";
  const closer = r.repType === "closer" || r.repType === "self_gen";

  return (
    <div className="flex flex-col gap-5 pb-6">
      <Link href={backHref} className="py-2 text-sm text-muted">
        ← {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{r.leaderName ? `Team ${r.leaderName}` : "No team leader"}</span>
        <span className="flex-1" />
        {staff && messageAction && (
          <form action={messageAction}>
            <input type="hidden" name="rep" value={r.id} />
            <button className="min-h-10 rounded-lg bg-charcoal-2 px-4 text-sm font-semibold">Message</button>
          </form>
        )}
        <CoachedButton repId={r.id} />
      </div>

      <RepCard r={r} today={d.today} href="#" />

      <Card>
        <p className="mb-3 text-xs font-bold tracking-widest text-tan uppercase">Daily numbers · last 2 weeks</p>
        {logs?.length ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] tracking-widest text-muted uppercase">
                <tr>
                  <th className="px-2 py-1 text-left">Day</th>
                  {setter && <th className="px-2 py-1 text-right">Doors</th>}
                  {setter && <th className="px-2 py-1 text-right">Convos</th>}
                  {setter && <th className="px-2 py-1 text-right">Appts</th>}
                  {closer && <th className="px-2 py-1 text-right">Sits</th>}
                  {closer && <th className="px-2 py-1 text-right">Closes</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.log_date} className="border-t border-charcoal-2/60">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {new Date(`${l.log_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                      {l.note && <p className="text-xs text-muted">{l.note}</p>}
                    </td>
                    {setter && <td className="px-2 py-2 text-right tabular-nums">{l.doors}</td>}
                    {setter && <td className="px-2 py-2 text-right tabular-nums">{l.convos}</td>}
                    {setter && <td className="px-2 py-2 text-right tabular-nums">{l.appts}</td>}
                    {closer && <td className="px-2 py-2 text-right tabular-nums">{l.sits}</td>}
                    {closer && <td className="px-2 py-2 text-right tabular-nums">{l.closes}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Nothing logged in the last two weeks.</p>
        )}
      </Card>

      {r.weakSkills.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-bold tracking-widest text-tan uppercase">Weakest skills in practice</p>
          <ul className="flex flex-col gap-1">
            {r.weakSkills.map((s) => (
              <li key={s.slug} className="flex justify-between">
                <span>{s.name}</span>
                <span className="tabular-nums text-muted">{s.avg.toFixed(1)} / 5</span>
              </li>
            ))}
          </ul>
          {r.lastFixes[0] && <p className="mt-3 text-sm text-muted">Latest fix: {r.lastFixes[0]}</p>}
        </Card>
      )}

      <Card>
        <p className="mb-2 text-xs font-bold tracking-widest text-tan uppercase">Practice role plays</p>
        {sessions?.length ? (
          <ul className="flex flex-col">
            {sessions.map((s) => {
              const sc = (Array.isArray(s.score) ? s.score[0] : s.score) as { overall: number } | null;
              return (
                <li key={s.id}>
                  <Link href={`/practice/session/${s.id}/results`} className="flex min-h-12 items-center justify-between border-t border-charcoal-2/60 py-2">
                    <span>
                      {(s.persona as unknown as { name: string } | null)?.name ?? "Role play"} <span className="text-xs text-muted">· {s.mode} · {when(s.started_at)}</span>
                    </span>
                    <span className="font-display text-xl font-black tabular-nums">{sc?.overall ?? "–"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">No role plays yet.</p>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-xs font-bold tracking-widest text-tan uppercase">Field recordings</p>
        {recs?.length ? (
          <ul className="flex flex-col">
            {recs.map((x) => (
              <li key={x.id}>
                <Link href={staff ? `/queue/${x.id}` : `/recordings/${x.id}`} className="flex min-h-12 items-center justify-between border-t border-charcoal-2/60 py-2">
                  <span>
                    {x.label || (x.setting === "door" ? "Door" : "Table")} <span className="text-xs text-muted">· {x.duration_s ? mmss(x.duration_s) : ""} · {when(x.created_at)}</span>
                  </span>
                  <span className="text-sm text-muted">{REP_STATUS[x.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No recordings yet.</p>
        )}
      </Card>

      {flags && flags.length > 0 && (
        <Card className="ring-1 ring-red">
          <p className="mb-2 text-xs font-bold tracking-widest text-red uppercase">Flags · last 2 weeks</p>
          <ul className="flex flex-col gap-2 text-sm">
            {flags.map((f, i) => (
              <li key={i}>
                <span className={f.severity === "red" ? "text-red" : "text-warn"}>●</span> {f.note} <span className="text-xs text-muted">· {f.source_type} · {when(f.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-xs font-bold tracking-widest text-tan uppercase">Coaching log</p>
        {touches?.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {touches.map((t, i) => (
              <li key={i}>
                <span className="font-semibold">{KIND[t.kind] ?? t.kind}</span> <span className="text-muted">· {when(t.created_at)} · {(t.coach as unknown as { full_name: string } | null)?.full_name ?? ""}</span>
                {t.note && <p className="text-muted">{t.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No 1:1s logged yet. Tap &ldquo;Mark coached&rdquo; after you meet.</p>
        )}
        {focus && focus.length > 1 && (
          <>
            <p className="mt-4 mb-2 text-xs font-bold tracking-widest text-tan uppercase">Past focus</p>
            <ul className="flex flex-col gap-1 text-sm">
              {focus.slice(1).map((f) => (
                <li key={f.week_start}>
                  <span className="text-muted">{when(`${f.week_start}T12:00:00Z`)}:</span> {f.focus}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
