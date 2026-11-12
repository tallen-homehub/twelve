"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadTrack } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/server";

/** Starts a role play session (optionally tied to a training task) and opens it. */
export async function startSession(formData: FormData) {
  const profile = await requireProfile();
  const personaId = String(formData.get("persona_id"));
  const mode = formData.get("mode") === "voice" ? "voice" : "text";
  let taskId: string | null = String(formData.get("task_id") || "") || null;

  if (taskId) {
    const view = await loadTrack(profile);
    const task = view?.findTask(taskId);
    if (!task || task.kind !== "roleplay" || !view?.canOpenDay(task.day_number)) taskId = null;
  }

  const supabase = await createClient();
  const { data: persona } = await supabase.from("personas").select("id, opening_line, start_trust").eq("id", personaId).single();
  if (!persona) throw new Error("Persona not found");

  const { data: session, error } = await supabase
    .from("roleplay_sessions")
    .insert({
      profile_id: profile.id,
      persona_id: persona.id,
      task_id: taskId,
      mode,
      // Text mode starts with the homeowner's opening line; voice mode speaks it live.
      turns: mode === "text" ? [{ role: "homeowner", text: persona.opening_line ?? "Hi?", t: 0 }] : [],
      state: { trust: persona.start_trust },
    })
    .select("id")
    .single();
  if (error || !session) throw new Error(error?.message ?? "Couldn't start the session");
  redirect(`/practice/session/${session.id}`);
}
