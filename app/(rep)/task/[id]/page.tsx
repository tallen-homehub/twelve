import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { requireProfile } from "@/lib/auth";
import { KIND_LABEL, loadTrack } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";
import { Card, ComingSoon, PageHeader } from "@/components/ui";
import { CompleteButton, FieldTaskForm, ReflectionForm } from "./forms";
import { QuizRunner, type QuizQuestion } from "./QuizRunner";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  const task = view?.findTask(id);
  if (!view || !task) notFound();

  const back = (
    <Link href={task.day_number === view.currentDay ? "/today" : `/day/${task.day_number}`} className="mb-4 inline-block py-2 text-sm text-muted">
      ← Day {task.day_number}
    </Link>
  );

  if (!view.canOpenDay(task.day_number)) {
    return (
      <>
        {back}
        <Card>This task isn&apos;t open yet.</Card>
      </>
    );
  }

  const done = view.done.has(task.id);
  const saved = view.progress.get(task.id)?.data as Record<string, unknown> | undefined;
  const header = <PageHeader eyebrow={`Day ${task.day_number} · ${KIND_LABEL[task.kind]}`} title={task.title.toLowerCase()} />;
  const supabase = await createClient();

  if (task.kind === "lesson" && task.ref_id) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("title, summary, body_md, mux_playback_id, is_draft_content")
      .eq("id", task.ref_id)
      .single();
    if (!lesson) notFound();
    return (
      <>
        {back}
        {header}
        {lesson.is_draft_content && (
          <p className="mb-4 inline-block rounded-full bg-charcoal px-3 py-1 text-xs font-bold text-tan">DRAFT · Chase&apos;s version coming</p>
        )}
        <div className="mb-6 flex aspect-video items-center justify-center rounded-2xl bg-charcoal text-center text-sm text-muted">
          {lesson.mux_playback_id ? "Video" : "Video coming from the studio day"}
        </div>
        {lesson.summary && <p className="mb-6 text-lg text-muted">{lesson.summary}</p>}
        <article className="lesson flex flex-col gap-4 pb-8 leading-relaxed">
          <Markdown
            components={{
              h2: ({ children }) => <h2 className="mt-4 font-display text-2xl font-black lowercase">{children}</h2>,
              ul: ({ children }) => <ul className="ml-5 list-disc space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2">{children}</ol>,
              strong: ({ children }) => <strong className="text-tan">{children}</strong>,
            }}
          >
            {lesson.body_md ?? ""}
          </Markdown>
        </article>
        <CompleteButton taskId={task.id} done={done} label="I've got it. Mark complete" />
      </>
    );
  }

  if (task.kind === "quiz" && task.ref_id) {
    const [{ data: questions }, { data: quiz }] = await Promise.all([
      supabase.rpc("get_quiz_questions", { p_quiz: task.ref_id }),
      supabase.from("quizzes").select("kind, pass_pct").eq("id", task.ref_id).single(),
    ]);
    return (
      <>
        {back}
        {header}
        {task.instructions && <p className="mb-6 text-muted">{task.instructions}</p>}
        {done && <p className="mb-6 rounded-xl bg-tan/15 px-4 py-3 font-semibold">Passed. You can retake it any time.</p>}
        <QuizRunner taskId={task.id} questions={(questions ?? []) as QuizQuestion[]} passPct={quiz?.pass_pct ?? 80} isAssessment={quiz?.kind === "assessment"} />
      </>
    );
  }

  if (task.kind === "field_task") {
    return (
      <>
        {back}
        {header}
        {task.instructions && <Card className="mb-6">{task.instructions}</Card>}
        <FieldTaskForm taskId={task.id} done={done} saved={saved} />
      </>
    );
  }

  if (task.kind === "reflection") {
    const prompts = (task.instructions ?? "").split("\n").filter(Boolean);
    return (
      <>
        {back}
        {header}
        <p className="mb-6 text-sm text-muted">Only you and Chase see these.</p>
        <ReflectionForm taskId={task.id} prompts={prompts} done={done} saved={saved} />
      </>
    );
  }

  if (task.kind === "roleplay" && task.ref_id) {
    const { data: persona } = await supabase.from("personas").select("slug, name, setting, opening_line").eq("id", task.ref_id).single();
    const best = (saved?.best_score as number | undefined) ?? null;
    return (
      <>
        {back}
        {header}
        {task.instructions && <p className="mb-4 text-muted">{task.instructions}</p>}
        {persona && (
          <Card className="mb-6">
            <p className="text-xs font-bold tracking-widest text-tan uppercase">{persona.setting === "door" ? "At the door" : "At the table"}</p>
            <p className="mt-1 text-lg font-semibold">{persona.name}</p>
            <p className="mt-1 text-sm text-muted italic">&ldquo;{persona.opening_line}&rdquo;</p>
          </Card>
        )}
        {done && <p className="mb-4 rounded-xl bg-tan/15 px-4 py-3 font-semibold">Done{best !== null ? ` · best score ${best}` : ""}. Run it again any time.</p>}
        {persona && (
          <Link href={`/practice/${persona.slug}?task=${task.id}`} className="flex min-h-14 items-center justify-center rounded-xl bg-tan px-5 py-4 text-lg font-bold text-ink">
            {done ? "Practice again" : "Start practice"}
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      {back}
      {header}
      <ComingSoon day="later" what="This task type isn't available yet." />
    </>
  );
}
