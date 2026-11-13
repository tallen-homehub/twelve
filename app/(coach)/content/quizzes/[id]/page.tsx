import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { QuizForm, type Q } from "./QuizForm";

export const metadata = { title: "Quiz" };

export default async function QuizEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const isNew = id === "new";
  const [{ data: quiz }, { data: qs }, { data: skills }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("quizzes").select("title, kind, pass_pct, published").eq("id", id).maybeSingle(),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("quiz_questions").select("prompt, qtype, options, correct, explanation, skill_slug").eq("quiz_id", id).order("position"),
    supabase.from("skills").select("slug, name").order("position"),
  ]);
  if (!isNew && !quiz) notFound();
  const questions: Q[] = (qs ?? [])
    .filter((q) => q.qtype !== "short")
    .map((q) => ({
      prompt: q.prompt,
      qtype: q.qtype as Q["qtype"],
      options: (q.options as string[]) ?? [],
      correct: Array.isArray(q.correct) ? (q.correct as number[]) : [Number(q.correct) || 0],
      explanation: q.explanation ?? "",
      skill_slug: q.skill_slug ?? "",
    }));
  return (
    <>
      <Link href="/content/quizzes" className="flex min-h-12 items-center text-sm text-muted">
        ← Quizzes
      </Link>
      <PageHeader eyebrow={isNew ? "New quiz" : "Quiz"} title={isNew ? "New quiz." : (quiz?.title ?? "")} />
      <QuizForm
        id={isNew ? null : id}
        quiz={{ title: quiz?.title ?? "", kind: (quiz?.kind as "quiz" | "assessment") ?? "quiz", pass_pct: quiz?.pass_pct ?? 80, published: quiz?.published ?? true, questions }}
        skills={skills ?? []}
      />
    </>
  );
}
