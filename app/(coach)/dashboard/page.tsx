import Link from "next/link";
import { firstName, requireProfile } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { Meter, NeedsList, Stat } from "@/components/dashboard/bits";
import { TeamTable } from "@/components/dashboard/TeamTable";

export const metadata = { title: "Dashboard" };

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function DashboardPage() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const d = await loadDashboard();
  const supabase = await createClient();
  const { count: drafts } = await supabase.from("coaching_notes").select("id", { count: "exact", head: true }).eq("status", "draft");
  const t = d.totals.thisWeek;
  const l = d.totals.lastWeek;
  const pulse = d.pulse.total ? Math.round(((d.pulse.coached7d + d.pulse.focusSet + d.pulse.loggedToday + d.pulse.activeLast3d) / (4 * d.pulse.total)) * 100) : 0;
  const href = (id: string) => `/reps/${id}`;

  return (
    <div className="flex flex-col gap-8 pb-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">
          Week of {fmtDay(d.weekStart)} · {d.pulse.total} reps
        </p>
        <h1 className="font-display text-4xl font-black leading-none lowercase">let&apos;s work, {firstName(me).toLowerCase()}.</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Doors" value={t.doors} last={l.doors} />
        <Stat label="Appts set" value={t.appts} last={l.appts} />
        <Stat label="Sits" value={t.sits} last={l.sits} />
        <Stat label="Closes" value={t.closes} last={l.closes} />
      </section>

      <section className="grid gap-4 rounded-2xl bg-charcoal p-5 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full ring-8 ring-tan/80">
            <span className="font-display text-3xl font-black">{pulse}</span>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-tan uppercase">Coaching pulse</p>
            <p className="text-sm text-muted">Is the team getting coached?</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Meter label="Coached in 7 days" n={d.pulse.coached7d} of={d.pulse.total} />
          <Meter label="Focus set" n={d.pulse.focusSet} of={d.pulse.total} />
          <Meter label="Logged today" n={d.pulse.loggedToday} of={d.pulse.total} />
          <Meter label="Active in 3 days" n={d.pulse.activeLast3d} of={d.pulse.total} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-black lowercase">needs you today</h2>
          {(drafts ?? 0) > 0 && (
            <Link href="/queue" className="rounded-full bg-tan px-3 py-2 text-sm font-bold text-ink">
              {drafts} notes to review
            </Link>
          )}
        </div>
        <NeedsList reps={d.reps} hrefFor={href} />
      </section>

      {d.teams.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-black lowercase">teams</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {d.teams.map((tm) => (
              <Link key={tm.leaderId ?? "none"} href={tm.leaderId ? `/team?leader=${tm.leaderId}` : "#"} className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-xl font-black lowercase">{tm.leaderName}</p>
                  <p className="text-xs text-muted">{tm.reps} reps</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(["doors", "appts", "sits", "closes"] as const).map((k) => (
                    <div key={k}>
                      <p className="text-[10px] font-bold tracking-widest text-muted uppercase">{k}</p>
                      <p className="font-display text-xl font-black tabular-nums">{tm.thisWeek[k]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  Practice avg {tm.rpAvg ?? "–"} · logged today {tm.loggedToday}/{tm.reps} · coached this week {tm.coached7d}/{tm.reps}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black lowercase">the team</h2>
        {d.reps.length ? <TeamTable d={d} hrefFor={href} /> : <p className="rounded-2xl bg-charcoal p-4 text-muted">No active reps yet. Invite reps and they&apos;ll show up here.</p>}
      </section>
    </div>
  );
}
