"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { loadTrack } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";

export type QuizResult = {
  score_pct: number;
  passed: boolean;
  pass_pct: number;
  results: { question_id: string; correct: boolean; given: unknown; answer: unknown; explanation: string | null; skill_slug: string | null }[];
};

async function accessibleTask(taskId: string) {
  const profile = await requireProfile();
  const view = await loadTrack(profile);
  const task = view?.findTask(taskId);
  if (!view || !task || !view.canOpenDay(task.day_number)) throw new Error("That task isn't open yet.");
  return { profile, task };
}

async function markDone(profileId: string, taskId: string, data: Record<string, unknown> | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_progress")
    .upsert({ profile_id: profileId, task_id: taskId, status: "done", completed_at: new Date().toISOString(), data });
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/track");
  revalidatePath(`/task/${taskId}`);
}

/** Lessons, field tasks and reflections. */
export async function completeTask(taskId: string, data: Record<string, unknown> | null = null) {
  const { profile, task } = await accessibleTask(taskId);
  if (task.kind === "quiz" || task.kind === "roleplay") throw new Error("This task completes itself when you pass it.");
  await markDone(profile.id, taskId, data);
  return { ok: true };
}

/** Grades a quiz on the server (answers never reach the browser) and completes the task on a pass. */
export async function submitQuiz(taskId: string, answers: Record<string, unknown>): Promise<QuizResult> {
  const { profile, task } = await accessibleTask(taskId);
  if (task.kind !== "quiz" || !task.ref_id) throw new Error("Not a quiz.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { p_quiz: task.ref_id, p_answers: answers });
  if (error) throw new Error(error.message);
  const result = data as QuizResult;
  if (result.passed) await markDone(profile.id, taskId, { score_pct: result.score_pct });
  else {
    revalidatePath("/today");
    revalidatePath("/track");
  }
  return result;
}
