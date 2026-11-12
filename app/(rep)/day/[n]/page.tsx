import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadTrack } from "@/lib/curriculum";
import { Card, PageHeader } from "@/components/ui";
import { TaskRow } from "@/components/learning";

export default async function DayPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  const day = view?.dayOf(dayNumber);
  if (!view || !day) notFound();

  const week = view.weekOf(day.week_number);
  const open = view.canOpenDay(dayNumber);

  return (
    <>
      <Link href="/track" className="mb-4 inline-block py-2 text-sm text-muted">
        ← Track
      </Link>
      <PageHeader eyebrow={`Day ${dayNumber} · Week ${week?.number}: ${week?.title}`} title={(day.title ?? `day ${dayNumber}`).toLowerCase()} />
      {open ? (
        <div className="flex flex-col gap-3">
          {day.tasks.map((t) => (
            <TaskRow key={t.id} task={t} done={view.done.has(t.id)} />
          ))}
        </div>
      ) : (
        <Card>This day isn&apos;t open yet.</Card>
      )}
    </>
  );
}
