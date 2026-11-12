import Link from "next/link";
import { requireProfile, firstName } from "@/lib/auth";
import { isLive, loadTrack } from "@/lib/curriculum";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { TaskRow } from "@/components/learning";
import { PhotoHero, PHOTOS, Ring, StatStrip } from "@/components/editorial";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { addDays, weekStartOf } from "@/lib/dashboard";
import { DailyLog } from "./DailyLog";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  const name = firstName(profile).toLowerCase();

  // Weekly focus from leadership, and the daily numbers card (reps and leaders who knock).
  const supabase = await createClient();
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const weekStart = weekStartOf(today);
  const [{ data: focus }, { data: logs }, { data: practice }] = await Promise.all([
    supabase.from("weekly_focus").select("focus").eq("profile_id", profile.id).eq("week_start", weekStartOf(today)).maybeSingle(),
    supabase.from("daily_logs").select("log_date, doors, convos, appts, sits, closes, note").eq("profile_id", profile.id).in("log_date", [today, yesterday]),
    supabase.from("roleplay_sessions").select("started_at, score:roleplay_scores(overall)").eq("profile_id", profile.id).eq("status", "scored").gte("started_at", `${addDays(weekStart, -7)}T00:00:00-08:00`),
  ]);
  const scores = (practice ?? []).map((p) => ({ at: p.started_at as string, v: ((Array.isArray(p.score) ? p.score[0] : p.score) as { overall: number } | null)?.overall })).filter((x): x is { at: string; v: number } => x.v != null);
  const avgOf = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const rpNow = avgOf(scores.filter((x) => x.at >= `${weekStart}T00:00:00-08:00`).map((x) => x.v));
  const rpLast = avgOf(scores.filter((x) => x.at < `${weekStart}T00:00:00-08:00`).map((x) => x.v));
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  const saved = Object.fromEntries((logs ?? []).map((l) => [l.log_date, { ...l, note: l.note ?? "" }]));
  const fieldBlock = (
    <div className="mb-6 flex flex-col gap-3">
      {focus?.focus && (
        <div className="rounded-sm bg-bone p-5 text-ink">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-bold tracking-[0.32em] uppercase">Focus · this week</p>
            <span className="font-serif text-base font-bold">XII</span>
          </div>
          <p className="mt-2 font-cond text-[32px] leading-[0.95]">{focus.focus}</p>
        </div>
      )}
      {<DailyLog repType={profile.rep_type} today={today} yesterday={yesterday} saved={saved} />}
    </div>
  );

  if (!view) {
    return (
      <>
        <PageHeader eyebrow="Today" title={`hey, ${name}.`} />
        {fieldBlock}
        <Card>
          <p>You don&apos;t have a training track yet.</p>
          <p className="mt-2 text-muted">Your leader will assign one. Check back soon.</p>
        </Card>
      </>
    );
  }

  const todayDay = view.dayOf(view.currentDay);
  const week = todayDay ? view.weekOf(todayDay.week_number) : undefined;
  const weekLocked = todayDay ? !view.unlockedWeeks.has(todayDay.week_number) : false;
  const tasks = todayDay?.tasks ?? [];
  const counted = tasks.filter((t) => t.required && isLive(t));
  const doneCount = counted.filter((t) => view.done.has(t.id)).length;

  // Required tasks from earlier open days that aren't done yet
  const catchUp = view.weeks
    .flatMap((w) => w.days)
    .filter((d) => d.day_number < view.currentDay && view.unlockedWeeks.has(d.week_number))
    .flatMap((d) => d.tasks)
    .filter((t) => t.required && isLive(t) && !view.done.has(t.id))
    .slice(0, 5);

  // The assessment that unlocks the current week, if it's still locked
  const prevWeek = week ? view.weekOf(week.number - 1) : undefined;
  const unlockTask = weekLocked
    ? prevWeek?.days.flatMap((d) => d.tasks).find((t) => t.kind === "quiz" && t.ref_id === prevWeek.assessment_quiz_id)
    : undefined;

  const hero = (
    <PhotoHero src={PHOTOS.profile} className="mb-4 h-[470px]" position="50% 18%" priority>
      <div className="safe-top flex items-start justify-between pt-4">
        <Logo width={104} />
        <p className="text-right text-[10px] leading-snug font-semibold">
          {dateLabel}
          <br />
          WEEK {String(week?.number ?? 1).padStart(2, "0")}
        </p>
      </div>
      <div className="absolute inset-x-5 bottom-5">
        <p className="eyebrow">Let&apos;s go, {name}</p>
        <h1 className="mt-1 font-cond text-[104px]">{weekday}</h1>
        <div className="mt-4">
          <StatStrip
            items={[
              { label: "Day", value: <p className="font-display text-[34px] leading-none font-black">{view.currentDay}<span className="text-base text-muted">/{view.track.total_days}</span></p> },
              { label: "Track", value: <p className="pt-1 text-sm leading-tight font-bold">{view.track.name}</p> },
              { label: "Streak", value: <p className="font-display text-[34px] leading-none font-black">{view.streak}<span className="text-base text-muted"> days</span></p> },
            ]}
          />
        </div>
      </div>
    </PhotoHero>
  );

  return (
    <>
      {hero}
      {view.previewMode && <p className="mb-4 rounded-sm bg-charcoal px-4 py-2 text-xs text-muted">Coach preview of the {view.track.name} track. Everything is unlocked for you.</p>}

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-sm bg-charcoal px-2 pt-5 pb-4">
        {[
          { label: "Today", ring: <Ring value={counted.length ? doneCount / counted.length : 0}><span className="font-display text-3xl leading-none font-black">{doneCount}/{counted.length}</span></Ring> },
          {
            label: "Practice",
            ring: (
              <Ring value={(rpNow ?? 0) / 100} tone="good">
                <span className="font-display text-3xl leading-none font-black">{rpNow ?? "–"}</span>
                {rpNow != null && rpLast != null && rpNow !== rpLast && <span className={`text-[10px] font-bold ${rpNow > rpLast ? "text-good" : "text-red"}`}>{rpNow > rpLast ? "▲" : "▼"} {Math.abs(rpNow - rpLast)}</span>}
              </Ring>
            ),
          },
          { label: "Streak", ring: <Ring value={Math.min(view.streak, 7) / 7} tone="warn"><span className="font-display text-3xl leading-none font-black">{view.streak}</span><span className="text-[10px] font-bold text-muted">days</span></Ring> },
        ].map((x) => (
          <div key={x.label} className="flex flex-col items-center gap-2">
            {x.ring}
            <span className="label">{x.label}</span>
          </div>
        ))}
      </div>

      {fieldBlock}

      {weekLocked ? (
        <Card className="mb-6">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Week {week?.number} is locked</p>
          <p className="mt-2">Pass the Week {prevWeek?.number} assessment to unlock today&apos;s work.</p>
          {unlockTask && (
            <div className="mt-4">
              <ButtonLink href={`/task/${unlockTask.id}`}>Take the assessment</ButtonLink>
            </div>
          )}
        </Card>
      ) : (
        <section className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="font-cond text-[34px]">Today&apos;s work</h2><span className="truncate text-sm text-muted">{todayDay?.title}</span></div>
          {week?.goal && view.currentDay === week.days[0]?.day_number && <p className="mb-3 text-sm text-muted">This week: {week.goal}</p>}
          <div className="flex flex-col gap-3">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} done={view.done.has(t.id)} />
            ))}
          </div>
          {counted.length > 0 && doneCount === counted.length && (
            // TODO-VOICE
            <p className="mt-4 rounded-xl bg-tan/15 px-4 py-3 text-center font-semibold">Day {view.currentDay} done. That&apos;s how it&apos;s built.</p>
          )}
        </section>
      )}

      {catchUp.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-cond text-[34px]">Catch up</h2>
          <div className="flex flex-col gap-3">
            {catchUp.map((t) => (
              <div key={t.id}>
                <p className="mb-1 text-xs text-muted">Day {t.day_number}</p>
                <TaskRow task={t} done={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Link href="/track" className="block py-2 text-center text-muted underline">
        See the full 60 days
      </Link>
    </>
  );
}
