import Link from "next/link";
import { firstName, isStaff, requireProfile } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { NeedsList, Stat } from "@/components/dashboard/bits";
import { RepCard } from "@/components/dashboard/RepCard";

export const metadata = { title: "My team" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ leader?: string }> }) {
  const me = await requireProfile({ roles: ["leader", "coach", "admin"] });
  const staff = isStaff(me.role);
  const { leader } = await searchParams;
  const leaderId = staff ? (leader ?? null) : me.id;
  const d = await loadDashboard({ leaderId });
  let title = `your team, ${firstName(me).toLowerCase()}.`;
  if (staff && leaderId) {
    const supabase = await createClient();
    const { data: l } = await supabase.from("profiles").select("full_name, preferred_name").eq("id", leaderId).maybeSingle();
    title = `team ${(l ? firstName(l) : "leader").toLowerCase()}.`;
  } else if (staff) title = "all reps.";
  const href = (id: string) => (staff ? `/reps/${id}` : `/team/rep/${id}`);
  const missing = d.reps.filter((r) => !r.loggedToday);
  const t = d.totals.thisWeek;
  const l = d.totals.lastWeek;

  return (
    <div className="flex flex-col gap-8 pb-6">
      {staff && (
        <Link href="/dashboard" className="-mb-4 py-2 text-sm text-muted">
          ← Dashboard
        </Link>
      )}
      <header>
        <p className="text-xs font-bold tracking-widest text-tan uppercase">{d.reps.length} reps · this week</p>
        <h1 className="font-display text-4xl font-black leading-none lowercase">{title}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Doors" value={t.doors} last={l.doors} />
        <Stat label="Appts set" value={t.appts} last={l.appts} />
        <Stat label="Sits" value={t.sits} last={l.sits} />
        <Stat label="Closes" value={t.closes} last={l.closes} />
      </section>

      <section className="rounded-2xl bg-charcoal p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Logged today</p>
          <p className="font-display text-2xl font-black tabular-nums">
            {d.reps.length - missing.length}/{d.reps.length}
          </p>
        </div>
        {missing.length > 0 ? (
          <p className="mt-2 text-sm">
            <span className="text-muted">Still waiting on: </span>
            {missing.map((r) => r.first).join(", ")}
          </p>
        ) : (
          d.reps.length > 0 && <p className="mt-2 text-sm text-good">Everyone&apos;s in. 👊</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black lowercase">needs you today</h2>
        <NeedsList reps={d.reps} hrefFor={href} limit={20} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black lowercase">your reps</h2>
        {d.reps.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.reps.map((r) => (
              <RepCard key={r.id} r={r} today={d.today} href={href(r.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-charcoal p-4 text-muted">No reps on this team yet. Leadership assigns reps to team leaders.</p>
        )}
      </section>
    </div>
  );
}
