import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { LessonForm } from "./LessonForm";

export const metadata = { title: "Lesson" };

export default async function LessonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const isNew = id === "new";
  const [{ data: lesson }, { data: skills }, { data: used }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("lessons").select("title, summary, body_md, video_url, module, skill_slugs, published, is_draft_content").eq("id", id).maybeSingle(),
    supabase.from("skills").select("slug, name").order("position"),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("tasks").select("day:days(day_number, week:weeks(track:tracks(name)))").eq("kind", "lesson").eq("ref_id", id),
  ]);
  if (!isNew && !lesson) notFound();
  const where = (used ?? []).map((u) => {
    const d = u.day as unknown as { day_number: number; week: { track: { name: string } } } | null;
    return d ? `${d.week?.track?.name} day ${d.day_number}` : "";
  });
  return (
    <>
      <Link href="/content/lessons" className="flex min-h-12 items-center text-sm text-muted">
        ← Lessons
      </Link>
      <PageHeader eyebrow={isNew ? "New lesson" : lesson?.is_draft_content ? "Lesson · placeholder draft" : "Lesson"} title={isNew ? "New lesson." : (lesson?.title ?? "")} />
      {where.length > 0 && <p className="-mt-3 mb-5 text-sm text-muted">Used on: {where.filter(Boolean).join(", ")}</p>}
      {isNew && <p className="-mt-3 mb-5 text-sm text-muted">After saving, add it to a day under Content → Tracks.</p>}
      <LessonForm id={isNew ? null : id} lesson={lesson ?? { title: "", summary: "", body_md: "", video_url: "", module: "core", skill_slugs: [], published: true }} skills={skills ?? []} />
    </>
  );
}
