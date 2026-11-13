import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { AddDay } from "./AddDay";

export const metadata = { title: "Tracks" };

type Day = { id: string; day_number: number; title: string | null; tasks: { count: number }[] };
type Week = { id: string; number: number; title: string; days: Day[] };

export default async function TracksPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, name, total_days, published, weeks(id, number, title, days(id, day_number, title, tasks(count)))")
    .order("name");
  return (
    <>
      <Link href="/content" className="flex min-h-12 items-center text-sm text-muted">
        ← Content
      </Link>
      <PageHeader eyebrow="Content" title="Tracks." />
      <p className="-mt-2 mb-4 text-sm text-muted">Tap a day to change what&apos;s on it.</p>
      <div className="flex flex-col gap-8">
        {(tracks ?? []).map((t) => {
          const weeks = ((t.weeks ?? []) as unknown as Week[]).sort((a, b) => a.number - b.number);
          const built = weeks.reduce((n, w) => n + w.days.length, 0);
          return (
            <section key={t.id} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-cond text-3xl">{t.name}</h2>
                <span className="text-xs text-muted">
                  {built} of {t.total_days} days built{!t.published && " · hidden"}
                </span>
              </div>
              {weeks.map((w) => (
                <div key={w.id} className="flex flex-col gap-1.5">
                  <p className="eyebrow text-muted">
                    Week {w.number} · {w.title}
                  </p>
                  {w.days
                    .sort((a, b) => a.day_number - b.day_number)
                    .map((d) => {
                      const n = d.tasks[0]?.count ?? 0;
                      return (
                        <Link key={d.id} href={`/content/track/day/${d.id}`} className="flex min-h-12 items-center gap-3 rounded-sm bg-charcoal px-4 py-2">
                          <span className="w-8 shrink-0 font-cond text-2xl text-tan">{d.day_number}</span>
                          <span className="min-w-0 flex-1 truncate">{d.title || <span className="text-muted">Untitled day</span>}</span>
                          <span className={`shrink-0 text-xs ${n ? "text-muted" : "text-warn"}`}>{n ? `${n} tasks` : "Empty"}</span>
                        </Link>
                      );
                    })}
                </div>
              ))}
              <AddDay trackId={t.id} />
            </section>
          );
        })}
      </div>
    </>
  );
}
