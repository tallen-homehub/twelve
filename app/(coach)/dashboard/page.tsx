import Link from "next/link";
import { firstName, requireProfile } from "@/lib/auth";
import { loadDashboard, type Numbers } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { Meter, NeedsList } from "@/components/dashboard/bits";
import { TeamTable } from "@/components/dashboard/TeamTable";
import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { PhotoHero, PHOTOS, Ring, Sparkline } from "@/components/editorial";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Dashboard" };

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();

export default async function DashboardPage() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const d = await loadDashboard();
  const supabase = await createClient();
  const [{ count: drafts }, { data: invites }] = await Promise.all([
    supabase.from("coaching_notes").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("invites").select("phone, full_name, role, created_at").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  const t = d.totals.thisWeek;
  const l = d.totals.lastWeek;
  const pulse = d.pulse.total ? Math.round(((d.pulse.coached7d + d.pulse.focusSet + d.pulse.loggedToday + d.pulse.activeLast3d) / (4 * d.pulse.total)) * 100) : 0;
  const href = (id: string) => `/reps/${id}`;
  const series = (k: keyof Numbers) => d.byDay.map((x) => x.n[k]);

  const tile = (label: string, k: keyof Numbers, highlight = false) => {
    const delta = l[k] > 0 ? Math.round(((t[k] - l[k]) / l[k]) * 100) : null;
    return (
      <div className={`flex flex-col gap-1.5 rounded-sm p-5 ${highlight ? "bg-tan text-ink" : "bg-charcoal"}`}>
        <span className={`label ${highlight ? "!text-ink" : ""}`}>{label}</span>
        <span className="font-cond text-[56px]">{t[k].toLocaleString()}</span>
        <span className={`text-xs font-bold ${highlight ? "" : delta == null ? "text-muted" : delta >= 0 ? "text-good" : "text-red"}`}>
          {delta == null ? `last week ${l[k]}` : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs last week`}
        </span>
        <Sparkline values={series(k)} className={highlight ? "text-ink" : "text-tan"} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-6">
      <PhotoHero src={PHOTOS.team} className="h-[340px]" position="50% 40%" fade="left" priority>
        <div className="flex h-full flex-col justify-between pt-5 pb-6">
          <div className="safe-top flex flex-wrap items-start justify-between gap-3">
            <Logo width={110} />
            <div className="flex flex-wrap gap-2">
              {(drafts ?? 0) > 0 && (
                <Link href="/queue" className="flex min-h-11 items-center rounded-sm border border-bone/40 bg-ink/60 px-4 text-sm font-bold">
                  Queue · {drafts}
                </Link>
              )}
              <Link href="/roster/new" className="flex min-h-11 items-center gap-1.5 rounded-sm bg-tan px-4 text-sm font-extrabold text-ink">
                <span aria-hidden="true" className="text-lg leading-none">+</span> Add reps
              </Link>
            </div>
          </div>
          <div>
            <p className="eyebrow">
              Week of {fmtDay(d.weekStart)} · {d.pulse.total} reps · {d.teams.filter((x) => x.leaderId).length} teams
            </p>
            <h1 className="mt-1 font-cond text-[88px] md:text-[120px]">The team.</h1>
            <p className="mt-1 text-sm text-muted">Let&apos;s work, {firstName(me)}.</p>
          </div>
        </div>
      </PhotoHero>

      <section className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_340px] flex-wrap items-center gap-6 rounded-sm bg-charcoal p-6">
          <Ring value={pulse / 100} size={150} stroke={8}>
            <span className="font-cond text-6xl">{pulse}</span>
            <span className="label">Pulse</span>
          </Ring>
          <div className="flex min-w-[180px] flex-1 flex-col gap-2.5">
            <p className="eyebrow">Is the team getting coached?</p>
            <Meter label="Coached in 7 days" n={d.pulse.coached7d} of={d.pulse.total} />
            <Meter label="Focus set" n={d.pulse.focusSet} of={d.pulse.total} />
            <Meter label="Logged today" n={d.pulse.loggedToday} of={d.pulse.total} />
            <Meter label="Active in 3 days" n={d.pulse.activeLast3d} of={d.pulse.total} />
          </div>
        </div>
        <div className="grid flex-[2_1_520px] grid-cols-2 gap-4 lg:grid-cols-4">
          {tile("Doors", "doors")}
          {tile("Appts set", "appts")}
          {tile("Sits", "sits")}
          {tile("Closes", "closes", true)}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-cond text-[40px]">Needs you today</h2>
        <NeedsList reps={d.reps} hrefFor={href} />
      </section>

      {d.teams.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-cond text-[40px]">Teams</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.teams.map((tm) => (
              <Link key={tm.leaderId ?? "none"} href={tm.leaderId ? `/team?leader=${tm.leaderId}` : "#"} className="flex flex-col gap-4 rounded-sm bg-charcoal p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-[26px] font-black uppercase">{tm.leaderId ? `Team ${tm.leaderName.split(" ")[0]}` : tm.leaderName}</p>
                  <p className="text-sm text-muted">{tm.reps} reps</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(["doors", "appts", "sits", "closes"] as const).map((k) => (
                    <div key={k}>
                      <p className="label">{k}</p>
                      <p className={`font-display text-[26px] font-black tabular-nums ${k === "closes" ? "text-tan" : ""}`}>{tm.thisWeek[k]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted">
                  Practice avg {tm.rpAvg ?? "–"} · logged today {tm.loggedToday}/{tm.reps} · coached {tm.coached7d}/{tm.reps}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-cond text-[40px]">Roster</h2>
          <Link href="/roster/new" className="flex min-h-11 items-center text-sm font-bold text-tan">
            + Add reps
          </Link>
        </div>
        {d.reps.length ? (
          <TeamTable d={d} hrefFor={href} editHref={(id) => `/reps/${id}/edit`} />
        ) : (
          <p className="rounded-sm bg-charcoal p-4 text-muted">No active reps yet. Tap &ldquo;Add reps&rdquo; to invite your team.</p>
        )}
        <PendingInvites invites={invites ?? []} />
      </section>
    </div>
  );
}
