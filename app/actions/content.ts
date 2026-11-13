"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rebuildAppBrain } from "@/lib/brain";
import { videoEmbed } from "@/lib/video";

/**
 * Content admin (spec 8.4). Staff only (RLS "staff write" on every content table).
 * Anything Chase saves is his content now, so is_draft_content flips to false.
 * The help bot's brain rebuilds after the response so it answers from the new version.
 */
export type ContentResult = { ok: boolean; message: string; id?: string };
const staff = () => requireProfile({ roles: ["coach", "admin"] });
const done = (id?: string, message = "Saved."): ContentResult => {
  after(() => rebuildAppBrain().catch(() => undefined));
  revalidatePath("/content", "layout");
  return { ok: true, message, id };
};
const fail = (e: unknown): ContentResult => ({ ok: false, message: e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : "Didn't save." });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// ───────── Lessons ─────────
const LessonSchema = z.object({
  title: z.string().trim().min(2).max(140),
  summary: z.string().trim().max(500).optional().default(""),
  body_md: z.string().max(40000).optional().default(""),
  video_url: z.string().trim().max(500).optional().default(""),
  module: z.enum(["core", "eq", "leadership", "values", "self_dev", "recruiting"]).default("core"),
  skill_slugs: z.array(z.string()).max(12).default([]),
  published: z.boolean().default(true),
});
export async function saveLesson(id: string | null, input: unknown): Promise<ContentResult> {
  try {
    await staff();
    const v = LessonSchema.parse(input);
    if (v.video_url && !videoEmbed(v.video_url)) return { ok: false, message: "That video link isn't one I can play. Use a YouTube, Vimeo, Loom, Google Drive or .mp4 link." };
    const row = { ...v, summary: v.summary || null, body_md: v.body_md || null, video_url: v.video_url || null, is_draft_content: false };
    const supabase = await createClient();
    const q = id ? supabase.from("lessons").update(row).eq("id", id).select("id").single() : supabase.from("lessons").insert(row).select("id").single();
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

// ───────── Quizzes ─────────
const QuestionSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
  qtype: z.enum(["single", "multi"]),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  correct: z.array(z.number().int().min(0)).min(1),
  explanation: z.string().trim().max(600).optional().default(""),
  skill_slug: z.string().optional().default(""),
});
const QuizSchema = z.object({
  title: z.string().trim().min(2).max(140),
  kind: z.enum(["quiz", "assessment"]),
  pass_pct: z.number().int().min(0).max(100),
  published: z.boolean().default(true),
  questions: z.array(QuestionSchema).min(1).max(30),
});
export async function saveQuiz(id: string | null, input: unknown): Promise<ContentResult> {
  try {
    await staff();
    const v = QuizSchema.parse(input);
    for (const [i, q] of v.questions.entries()) {
      if (q.correct.some((c) => c >= q.options.length)) return { ok: false, message: `Question ${i + 1}: pick the right answer.` };
      if (q.qtype === "single" && q.correct.length !== 1) return { ok: false, message: `Question ${i + 1}: single-answer questions need exactly one right answer.` };
    }
    const supabase = await createClient();
    const meta = { title: v.title, kind: v.kind, pass_pct: v.pass_pct, published: v.published };
    const { data: quiz, error } = id ? await supabase.from("quizzes").update(meta).eq("id", id).select("id").single() : await supabase.from("quizzes").insert(meta).select("id").single();
    if (error || !quiz) throw new Error(error?.message ?? "Couldn't save the quiz.");
    // Replace the question set (attempts store their own answers, so history is safe).
    const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
    if (delErr) throw new Error(delErr.message);
    const { error: insErr } = await supabase.from("quiz_questions").insert(
      v.questions.map((q, i) => ({
        quiz_id: quiz.id,
        position: i + 1,
        prompt: q.prompt,
        qtype: q.qtype,
        options: q.options,
        correct: q.qtype === "single" ? q.correct[0] : q.correct,
        explanation: q.explanation || null,
        skill_slug: q.skill_slug || null,
      })),
    );
    if (insErr) throw new Error(insErr.message);
    return done(quiz.id);
  } catch (e) {
    return fail(e);
  }
}

// ───────── Homeowners (personas) ─────────
const PersonaSchema = z.object({
  name: z.string().trim().min(2).max(60),
  setting: z.enum(["door", "table"]),
  difficulty: z.number().int().min(1).max(5),
  backstory: z.string().trim().max(2000),
  opening_line: z.string().trim().min(2).max(300),
  objections: z.array(z.string().trim().min(2).max(300)).max(12),
  success_condition: z.string().trim().max(300),
  start_trust: z.number().int().min(0).max(10),
  voice_id: z.enum(["coral", "shimmer", "ash", "marin", "cedar", "sage", "verse", "ballad"]).nullable().default(null),
  published: z.boolean().default(true),
});
export async function savePersona(id: string | null, input: unknown): Promise<ContentResult> {
  try {
    await staff();
    const v = PersonaSchema.parse(input);
    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("personas").update(v).eq("id", id);
      if (error) throw new Error(error.message);
      return done(id);
    }
    let slug = slugify(v.name) || "homeowner";
    const { data: clash } = await supabase.from("personas").select("slug").like("slug", `${slug}%`);
    if (clash?.some((c) => c.slug === slug)) slug = `${slug}-${(clash?.length ?? 0) + 1}`;
    const { data, error } = await supabase.from("personas").insert({ ...v, slug }).select("id").single();
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

// ───────── Rubric (skills) ─────────
const SkillSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(80),
  stage: z.enum(["door", "table", "mindset", "compliance"]),
  description: z.string().trim().max(600),
  what_good_sounds_like: z.string().trim().max(800),
});
export async function saveSkills(input: unknown): Promise<ContentResult> {
  try {
    await staff();
    const list = z.array(SkillSchema).max(40).parse(input);
    const supabase = await createClient();
    for (const [i, s] of list.entries()) {
      const row = { name: s.name, stage: s.stage, description: s.description || null, what_good_sounds_like: s.what_good_sounds_like || null, position: i + 1 };
      const { error } = s.id ? await supabase.from("skills").update(row).eq("id", s.id) : await supabase.from("skills").insert({ ...row, slug: slugify(s.name) });
      if (error) throw new Error(`${s.name}: ${error.message}`);
    }
    return done(undefined, "Rubric saved. New scores use it right away.");
  } catch (e) {
    return fail(e);
  }
}

// ───────── Track: tasks on a day ─────────
const TaskSchema = z.object({
  id: z.string().uuid().nullable(),
  kind: z.enum(["lesson", "quiz", "roleplay", "field_task", "reflection", "workbook"]),
  ref_id: z.string().uuid().nullable(),
  title: z.string().trim().min(2).max(140),
  instructions: z.string().trim().max(2000).optional().default(""),
  est_minutes: z.number().int().min(0).max(600).nullable(),
  required: z.boolean(),
});
export async function saveDayTasks(dayId: string, dayTitle: string, input: unknown): Promise<ContentResult> {
  try {
    await staff();
    const tasks = z.array(TaskSchema).max(15).parse(input);
    for (const t of tasks) {
      if (["lesson", "quiz", "roleplay"].includes(t.kind) && !t.ref_id) return { ok: false, message: `"${t.title}": pick which ${t.kind === "roleplay" ? "homeowner" : t.kind} it opens.` };
    }
    const supabase = await createClient();
    await supabase.from("days").update({ title: dayTitle.trim().slice(0, 120) || null }).eq("id", dayId);
    const { data: existing } = await supabase.from("tasks").select("id").eq("day_id", dayId);
    const keep = new Set(tasks.map((t) => t.id).filter(Boolean));
    const removed = (existing ?? []).map((e) => e.id).filter((id) => !keep.has(id));
    if (removed.length) {
      // Deleting a task would also delete reps' progress on it; don't let that happen by accident.
      const { count } = await supabase.from("task_progress").select("task_id", { count: "exact", head: true }).in("task_id", removed);
      if (count) return { ok: false, message: "Reps have already done a task you removed. Mark it optional instead of deleting it." };
      const { error } = await supabase.from("tasks").delete().in("id", removed);
      if (error) throw new Error(error.message);
    }
    for (const [i, t] of tasks.entries()) {
      const row = { day_id: dayId, position: i + 1, kind: t.kind, ref_id: ["lesson", "quiz", "roleplay"].includes(t.kind) ? t.ref_id : null, title: t.title, instructions: t.instructions || null, est_minutes: t.est_minutes, required: t.required };
      const { error } = t.id ? await supabase.from("tasks").update(row).eq("id", t.id) : await supabase.from("tasks").insert(row);
      if (error) throw new Error(`${t.title}: ${error.message}`);
    }
    return done(dayId);
  } catch (e) {
    return fail(e);
  }
}

// ───────── Track: add a day ─────────
/** Adds the next day to a track. Fills the last week up to 7 days, then starts a new week. */
export async function addDay(trackId: string): Promise<ContentResult> {
  try {
    await staff();
    z.string().uuid().parse(trackId);
    const supabase = await createClient();
    const { data: track } = await supabase.from("tracks").select("total_days").eq("id", trackId).single();
    const { data: weeks } = await supabase.from("weeks").select("id, number, days(day_number)").eq("track_id", trackId).order("number");
    const all = (weeks ?? []).flatMap((w) => (w.days as { day_number: number }[]).map((d) => d.day_number));
    const next = (all.length ? Math.max(...all) : 0) + 1;
    if (track && next > track.total_days) return { ok: false, message: `This track is ${track.total_days} days long and they're all there.` };
    const last = weeks?.at(-1);
    let weekId = last?.id;
    if (!last || (last.days as unknown[]).length >= 7) {
      const number = (last?.number ?? 0) + 1;
      const { data: w, error } = await supabase.from("weeks").insert({ track_id: trackId, number, title: `Week ${number}` }).select("id").single();
      if (error) throw new Error(error.message);
      weekId = w.id;
    }
    const { data: day, error } = await supabase.from("days").insert({ week_id: weekId, day_number: next, title: null }).select("id").single();
    if (error) throw new Error(error.message);
    return done(day.id, `Day ${next} added.`);
  } catch (e) {
    return fail(e);
  }
}
