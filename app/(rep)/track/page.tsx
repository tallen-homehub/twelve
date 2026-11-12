import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadTrack } from "@/lib/curriculum";
import { Card, PageHeader } from "@/components/ui";
import { DayChip } from "@/components/learning";

export const metadata = { title: "Track" };

export default async function TrackPage() {
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  if (!view) {
    return (
      <>
        <PageHeader eyebrow="Your track" title="the track." />
        <Card>No track assigned yet.</Card>
      </>
    );
  }

  const daysDone = view.weeks.flatMap((w) => w.days).filter((d) => view.dayState(d) === "done").length;

  return (
    <>
      <PageHeader eyebrow={`${view.track.name} · ${daysDone} of ${view.track.total_days} days done`} title="the track." />
      <div className="flex flex-col gap-8">
        {view.weeks.map((w) => {
          const locked = !view.unlockedWeeks.has(w.number);
          return (
            <section key={w.id}>
              <div className="mb-3">
                <p className="text-xs font-bold tracking-widest text-tan uppercase">
                  Week {w.number}
                  {locked ? " · locked" : ""}
                </p>
                <h2 className="font-display text-2xl font-black lowercase">{w.title}</h2>
                {w.goal && <p className="text-sm text-muted">{w.goal}</p>}
                {locked && w.number > 1 && <p className="mt-1 text-sm text-muted">Unlocks when you pass the Week {w.number - 1} assessment.</p>}
              </div>
              <ol className="flex flex-col gap-2">
                {w.days.map((d) => {
                  const state = view.dayState(d);
                  const row = (
                    <div className={`flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 ${state === "today" ? "bg-charcoal-2 ring-2 ring-tan" : "bg-charcoal"}`}>
                      <span className="w-10 shrink-0 font-display text-lg font-black text-muted">{d.day_number}</span>
                      <span className={`flex-1 truncate ${state === "locked" || state === "upcoming" ? "text-muted" : ""}`}>{d.title}</span>
                      <DayChip state={state} />
                    </div>
                  );
                  return (
                    <li key={d.id}>
                      {view.canOpenDay(d.day_number) ? <Link href={`/day/${d.day_number}`}>{row}</Link> : row}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </>
  );
}
