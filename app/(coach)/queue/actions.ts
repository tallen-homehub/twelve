"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeRecording, CoachingNoteSchema, startTranscription, type CoachingNote } from "@/lib/recordings";
import { appBaseUrl } from "@/lib/url";

const staff = () => requireProfile({ roles: ["coach", "admin"] });

/** Share of editable fields Chase changed (0 = released as drafted, 1 = rewrote everything). Feeds the voice loop. */
function editShare(ai: CoachingNote, final: CoachingNote) {
  const fields = (n: CoachingNote) => [n.summary, String(n.overall_score), ...n.moments.flatMap((m) => [m.severity, m.what_happened, m.chase_would_say ?? "", m.why, String(m.t_start)])];
  const a = fields(ai);
  const b = fields(final);
  const total = Math.max(a.length, b.length);
  let changed = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i].trim() !== b[i].trim()) changed++;
  return Math.round((changed / total) * 100) / 100;
}

/** Approve and release a note to the rep. Stores Chase's final version next to the AI's. */
export async function releaseNote(noteId: string, edited: unknown) {
  const me = await staff();
  const final = CoachingNoteSchema.parse(edited);
  final.moments.sort((a, b) => a.t_start - b.t_start);
  const admin = createAdminClient();
  const { data: note } = await admin
    .from("coaching_notes")
    .select("id, recording_id, profile_id, ai_output, status, recording:recordings(setting)")
    .eq("id", noteId)
    .single();
  if (!note) throw new Error("Note not found");
  if (note.status === "released") throw new Error("Already released.");
  const ai = note.ai_output as CoachingNote;
  const setting = (note.recording as unknown as { setting: string } | null)?.setting ?? "door";

  await admin
    .from("coaching_notes")
    .update({
      status: "released",
      final_output: final,
      overall_score: Math.round(final.overall_score),
      edit_distance: editShare(ai, final),
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", noteId);
  await admin.from("recordings").update({ status: "released", error: null }).eq("id", note.recording_id);

  // Flags follow Chase's final call, not the AI's.
  await admin.from("flags").delete().eq("source_type", "recording").eq("source_id", note.recording_id);
  const flags = final.moments
    .filter((m) => m.severity !== "good")
    .map((m) => ({ profile_id: note.profile_id, source_type: "recording", source_id: note.recording_id, t_start: m.t_start, t_end: m.t_end, skill_slug: m.skill, severity: m.severity, note: m.what_happened }));
  if (flags.length) await admin.from("flags").insert(flags);

  // Voice loop: lines Chase wrote or rewrote become examples for future drafts.
  const aiLines = new Set(ai.moments.map((m) => (m.chase_would_say ?? "").trim()));
  const examples = final.moments
    .filter((m) => m.chase_would_say && !aiLines.has(m.chase_would_say.trim()))
    .map((m) => ({ situation: `${setting} · ${m.skill} · ${m.severity}`, text: m.chase_would_say!.trim(), source: `coaching_note:${noteId}` }));
  if (final.summary.trim() !== ai.summary.trim()) examples.push({ situation: `${setting} · summary`, text: final.summary.trim(), source: `coaching_note:${noteId}` });
  if (examples.length) await admin.from("voice_examples").insert(examples);

  await admin.from("audit_log").insert({ actor: me.id, action: "coaching_note.release", target_type: "coaching_note", target_id: noteId });
  revalidatePath("/queue");
}

export async function rejectNote(noteId: string, reason: string) {
  const me = await staff();
  const why = reason.trim().slice(0, 500);
  if (!why) throw new Error("Add a short reason.");
  const admin = createAdminClient();
  const { data: note } = await admin.from("coaching_notes").select("recording_id").eq("id", noteId).single();
  if (!note) throw new Error("Note not found");
  await admin.from("coaching_notes").update({ status: "rejected", reject_reason: why, reviewed_by: me.id, reviewed_at: new Date().toISOString() }).eq("id", noteId);
  await admin.from("recordings").update({ status: "failed", error: `Not released: ${why}` }).eq("id", note.recording_id);
  await admin.from("audit_log").insert({ actor: me.id, action: "coaching_note.reject", target_type: "coaching_note", target_id: noteId, detail: { reason: why } });
  revalidatePath("/queue");
}

/** Staff listened and confirmed the homeowner agreed; run the coaching step. */
export async function confirmConsent(recordingId: string) {
  const me = await staff();
  const admin = createAdminClient();
  await admin.from("recordings").update({ status: "analyzing", error: null }).eq("id", recordingId);
  await admin.from("audit_log").insert({ actor: me.id, action: "recording.consent_confirmed", target_type: "recording", target_id: recordingId });
  after(() => analyzeRecording(recordingId, { consentConfirmedBy: me.id }));
  revalidatePath(`/queue/${recordingId}`);
}

/** Re-runs a failed recording from wherever it stopped. */
export async function rerunRecording(recordingId: string) {
  await staff();
  const admin = createAdminClient();
  const { data: tr } = await admin.from("transcripts").select("recording_id, utterances").eq("recording_id", recordingId).maybeSingle();
  const hasTranscript = Array.isArray(tr?.utterances) && tr.utterances.length > 0;
  await admin.from("recordings").update({ status: hasTranscript ? "analyzing" : "uploaded", error: null }).eq("id", recordingId);
  if (hasTranscript) after(() => analyzeRecording(recordingId));
  else {
    const base = await appBaseUrl();
    after(() => startTranscription(recordingId, base));
  }
  revalidatePath(`/queue/${recordingId}`);
}

/** Deletes the audio, transcript and notes (e.g. no consent). */
export async function deleteRecording(recordingId: string) {
  const me = await staff();
  const admin = createAdminClient();
  const { data: r } = await admin.from("recordings").select("storage_path").eq("id", recordingId).single();
  if (!r) return;
  await admin.storage.from("recordings").remove([r.storage_path]);
  await admin.from("flags").delete().eq("source_type", "recording").eq("source_id", recordingId);
  await admin.from("recordings").delete().eq("id", recordingId);
  await admin.from("audit_log").insert({ actor: me.id, action: "recording.delete", target_type: "recording", target_id: recordingId });
  revalidatePath("/queue");
}
