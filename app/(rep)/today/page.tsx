import Link from "next/link";
import { requireProfile, firstName } from "@/lib/auth";
import { isLive, loadTrack } from "@/lib/curriculum";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { ProgressRing, TaskRow } from "@/components/learning";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  const name = firstName(profile).toLowerCase();

  if (!view) {
    return (
      <>
        <PageHeader eyebrow="Today" title={`hey, ${name}.`} />
        <Card>
          <p>You don&apos;t have a training track yet.</p>
          <p className="mt-2 text-muted">Your leader will assign one. Check back soon.</p>
        </Card>
      </>
    );
  }

  const today = view.dayOf(view.currentDay);
  const week = today ? view.weekOf(today.week_number) : undefined;
  const weekLocked = today ? !view.unlockedWeeks.has(today.week_number) : false;
  const tasks = today?.tasks ?? [];
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

  return (
    <>
      {view.previewMode && (
        <p className="mb-4 rounded-xl bg-charcoal px-4 py-2 text-xs text-muted">
          Coach preview of the New Setter track. Everything is unlocked for you.
        </p>
      )}
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow={`Day ${view.currentDay} of ${view.track.total_days} · ${view.track.name}`} title={`let's go, ${name}.`} />
        <ProgressRing done={doneCount} total={counted.length} />
      </div>

      <div className="mb-6 flex gap-3 text-sm">
        <span className="rounded-full bg-charcoal px-3 py-2">
          <strong className="text-tan">{view.streak}</strong> day streak
        </span>
        {week && (
          <span className="truncate rounded-full bg-charcoal px-3 py-2">
            Week {week.number}: {week.title}
          </span>
        )}
      </div>

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
          <h2 className="mb-3 font-display text-xl font-black lowercase">{today?.title ?? "today"}</h2>
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
          <h2 className="mb-3 font-display text-xl font-black lowercase">catch up</h2>
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
