import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { DayForm, type Kind, type Task } from "./DayForm";

export const metadata = { title: "Day" };

export default async function DayEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const [{ data: day }, { data: tasks }, { data: lessons }, { data: quizzes }, { data: personas }] = await Promise.all([
    supabase.from("days").select("day_number, title, weeks(number, title, tracks(name))").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("id, kind, ref_id, title, instructions, est_minutes, required").eq("day_id", id).order("position"),
    supabase.from("lessons").select("id, title").order("title"),
    supabase.from("quizzes").select("id, title").order("title"),
    supabase.from("personas").select("id, name").order("name"),
  ]);
  if (!day) notFound();
  const week = day.weeks as unknown as { number: number; title: string; tracks: { name: string } } | null;
  const list: Task[] = (tasks ?? []).map((t) => ({
    id: t.id,
    kind: t.kind as Kind,
    ref_id: t.ref_id,
    title: t.title,
    instructions: t.instructions ?? "",
    est_minutes: t.est_minutes,
    required: t.required,
  }));
  return (
    <>
      <Link href="/content/track" className="flex min-h-12 items-center text-sm text-muted">
        ← Tracks
      </Link>
      <PageHeader eyebrow={`${week?.tracks.name ?? "Track"} · Week ${week?.number ?? ""}`} title={`Day ${day.day_number}.`} />
      <DayForm
        dayId={id}
        title={day.title ?? ""}
        tasks={list}
        options={{
          lesson: lessons ?? [],
          quiz: quizzes ?? [],
          roleplay: (personas ?? []).map((p) => ({ id: p.id, title: p.name })),
        }}
      />
    </>
  );
}
