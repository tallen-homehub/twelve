import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { callClaude, extractJson, MODELS } from "@/lib/ai/claude";
import { fill, getPrompt } from "@/lib/ai/prompts";
import { trackDay } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
export { mmss } from "@/lib/format";

/**
 * Recording pipeline (spec section 7):
 * upload → Deepgram (async, calls us back) → triage (speakers, consent, names) → redact → coaching draft → Chase's queue.
 * Every step uses the service role and only runs after the caller is checked (server action, signed webhook, or staff).
 */

export const ACCEPTED_AUDIO = ".m4a,.mp3,.wav,.aac,.mp4,.mov,audio/*,video/mp4,video/quicktime";
export const CONSENT_SCRIPT = {
  ask: "Our team records some meetings for training and quality. Are you okay with me recording this one?",
  confirm: "This call's being recorded, you're good with that?",
};
// TODO-VOICE: replace with Chase's captured voice profile once it exists.
const DRAFT_VOICE_PROFILE =
  "Direct, specific, encouraging but honest. Short sentences. Talks like a coach at the door, not a textbook. Calls out what worked before what didn't.";
const TRIAGE_WINDOW_S = 5 * 60;

export type Utterance = { start: number; end: number; speaker: number; text: string };
export type SpeakerMap = { rep: number[]; homeowner: number[]; other: number[] };

export const MomentSchema = z.object({
  t_start: z.number(),
  t_end: z.number(),
  skill: z.string(),
  severity: z.enum(["red", "yellow", "good"]),
  rep_said: z.string(),
  what_happened: z.string(),
  chase_would_say: z.string().nullable(),
  why: z.string(),
});
export const CoachingNoteSchema = z.object({
  overall_score: z.number().min(0).max(100),
  outcome_guess: z.enum(["set", "closed", "follow_up", "lost", "unclear"]),
  summary: z.string(),
  moments: z.array(MomentSchema).min(1).max(8),
  per_skill: z.record(z.string(), z.number().int().min(1).max(5)),
  practice_next: z.object({ skill: z.string(), persona_slug: z.string().nullable() }),
});
export type Moment = z.infer<typeof MomentSchema>;
export type CoachingNote = z.infer<typeof CoachingNoteSchema>;

const TriageSchema = z.object({
  speaker_map: z.object({
    rep: z.array(z.number()),
    homeowner: z.array(z.number()).default([]),
    other: z.array(z.number()).default([]),
  }),
  consent: z.object({ found: z.boolean(), t: z.number().nullable().optional(), quote: z.string().nullable().optional() }),
  names_to_mask: z.array(z.string()).default([]),
});

// ───────────── Webhook signing ─────────────

function webhookSecret() {
  const s = process.env.RECORDING_WEBHOOK_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No webhook secret configured.");
  return s;
}
export function signRecording(id: string) {
  return createHmac("sha256", webhookSecret()).update(`deepgram:${id}`).digest("hex");
}
export function verifyRecordingSig(id: string, sig: string) {
  const a = Buffer.from(signRecording(id));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ───────────── Steps ─────────────

async function setStatus(id: string, status: string, error: string | null = null) {
  await createAdminClient().from("recordings").update({ status, error }).eq("id", id);
}

async function logJob(recordingId: string, status: "running" | "done" | "failed", lastError?: string) {
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("id, attempts")
    .eq("type", "process-recording")
    .eq("payload->>recording_id", recordingId)
    .maybeSingle();
  if (job) {
    await admin
      .from("jobs")
      .update({ status, attempts: job.attempts + (status === "running" ? 1 : 0), last_error: lastError ?? null })
      .eq("id", job.id);
  } else {
    await admin.from("jobs").insert({ type: "process-recording", payload: { recording_id: recordingId }, status, attempts: 1, last_error: lastError ?? null });
  }
}

/** Step 1: hand the audio to Deepgram. Returns right away; Deepgram calls /api/recordings/deepgram when done. */
export async function startTranscription(recordingId: string, baseUrl: string) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    await setStatus(recordingId, "failed", "DEEPGRAM_API_KEY is not set in Vercel.");
    return;
  }
  const admin = createAdminClient();
  const { data: rec } = await admin.from("recordings").select("id, storage_path").eq("id", recordingId).single();
  if (!rec) throw new Error("Recording not found");

  // Deepgram fetches the file itself; the link lasts 6 hours in case their queue is slow.
  const { data: signed, error: signErr } = await admin.storage.from("recordings").createSignedUrl(rec.storage_path, 6 * 3600);
  if (signErr || !signed) {
    await setStatus(recordingId, "failed", `Couldn't read the upload: ${signErr?.message ?? "no file"}`);
    return;
  }

  const callback = `${baseUrl}/api/recordings/deepgram?id=${recordingId}&sig=${signRecording(recordingId)}`;
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL ?? "nova-3",
    smart_format: "true",
    punctuate: "true",
    diarize: "true",
    utterances: "true",
    callback,
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: signed.signedUrl }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    await setStatus(recordingId, "failed", `Deepgram ${res.status}: ${detail}`);
    await logJob(recordingId, "failed", detail);
    return;
  }
  await setStatus(recordingId, "transcribing");
  await logJob(recordingId, "running");
}

type DeepgramPayload = {
  metadata?: { duration?: number };
  results?: { utterances?: { start: number; end: number; speaker?: number; transcript: string }[] };
  err_code?: string;
  err_msg?: string;
};

/** Step 1b: Deepgram's callback. Stores the raw words and moves on to analysis. */
export async function saveTranscript(recordingId: string, payload: DeepgramPayload) {
  const admin = createAdminClient();
  const raw = payload.results?.utterances;
  if (!raw) {
    const why = payload.err_msg ?? "Deepgram returned no transcript.";
    await setStatus(recordingId, "failed", why);
    await logJob(recordingId, "failed", why);
    return false;
  }
  const utterances: Utterance[] = raw
    .filter((u) => u.transcript?.trim())
    .map((u) => ({ start: round1(u.start), end: round1(u.end), speaker: u.speaker ?? 0, text: u.transcript.trim() }));
  await admin.from("transcripts").upsert({ recording_id: recordingId, provider: "deepgram", utterances, raw: null });
  await admin
    .from("recordings")
    .update({ status: "analyzing", error: null, duration_s: Math.round(payload.metadata?.duration ?? utterances.at(-1)?.end ?? 0) })
    .eq("id", recordingId);
  return true;
}

/**
 * Steps 2–7: who's who, consent check, redaction, coaching draft.
 * consentConfirmedBy = a staff member who listened and confirmed consent after the AI couldn't find it.
 */
export async function analyzeRecording(recordingId: string, opts: { consentConfirmedBy?: string } = {}) {
  const admin = createAdminClient();
  try {
    const { data: rec } = await admin
      .from("recordings")
      .select("id, profile_id, setting, profile:profiles(full_name, preferred_name, rep_type, track_started_on)")
      .eq("id", recordingId)
      .single();
    const { data: tr } = await admin.from("transcripts").select("utterances, speaker_map, consent").eq("recording_id", recordingId).single();
    if (!rec || !tr) throw new Error("Recording or transcript missing");
    let utterances = (tr.utterances ?? []) as Utterance[];
    if (!utterances.length) throw new Error("The transcript is empty. Was the recording silent?");
    await setStatus(recordingId, "analyzing");

    // 2–3. Who's who + consent (+ names to mask), on the first five minutes.
    let speakerMap = tr.speaker_map as SpeakerMap | null;
    let consent = tr.consent as { found: boolean; t?: number | null; quote?: string | null; confirmed_by?: string } | null;
    if (!speakerMap || !consent) {
      const prompt = await getPrompt("recording_triage");
      const opening = utterances.filter((u) => u.start <= TRIAGE_WINDOW_S);
      const system = fill(prompt.body, {
        setting: rec.setting,
        transcript: opening.map((u) => `[${Math.round(u.start)}] Speaker ${u.speaker}: ${u.text}`).join("\n"),
      });
      const triage = await withRetry(async (hint) => {
        const raw = await callClaude({ system, messages: [{ role: "user", content: `Check this recording.${hint}` }], model: prompt.model || MODELS.fast, maxTokens: 800 });
        return TriageSchema.parse(extractJson(raw));
      });
      speakerMap = triage.speaker_map;
      consent = { found: triage.consent.found, t: triage.consent.t ?? null, quote: triage.consent.quote ?? null };
      utterances = redact(utterances, triage.names_to_mask);
      await admin.from("transcripts").update({ speaker_map: speakerMap, consent, utterances }).eq("recording_id", recordingId);
    }

    if (opts.consentConfirmedBy) {
      consent = { ...(consent ?? { found: false }), found: true, confirmed_by: opts.consentConfirmedBy };
      await admin.from("transcripts").update({ consent }).eq("recording_id", recordingId);
    }
    if (!consent?.found) {
      await setStatus(recordingId, "needs_consent_review", "No recording consent found in the first 5 minutes.");
      await logJob(recordingId, "done");
      return;
    }

    // 5–6. Coaching draft.
    const profile = rec.profile as unknown as { full_name: string; preferred_name: string | null; rep_type: string | null; track_started_on: string | null };
    const [{ data: skills }, { data: personas }, { data: examples }] = await Promise.all([
      admin.from("skills").select("slug, name, what_good_sounds_like").in("stage", [rec.setting, "mindset", "compliance"]).order("position"),
      admin.from("personas").select("slug, setting").eq("setting", rec.setting),
      admin.from("voice_examples").select("situation, text").eq("approved", true).order("created_at", { ascending: false }).limit(8),
    ]);
    const prompt = await getPrompt("coaching_note");
    const system = fill(prompt.body, {
      voice_profile: DRAFT_VOICE_PROFILE,
      examples: examples?.length ? examples.map((e) => `- (${e.situation}) "${e.text}"`).join("\n") : "(none yet)",
      rubric: (skills ?? []).map((s) => `- ${s.slug}: ${s.name}. ${s.what_good_sounds_like ?? ""}`).join("\n"),
      setting: rec.setting === "door" ? "door knock" : "sit-down table appointment",
      rep_first_name: profile.preferred_name || profile.full_name.split(" ")[0] || "the rep",
      rep_type: profile.rep_type?.replace("_", "-") ?? "rep",
      day: trackDay(profile.track_started_on),
      persona_slugs: (personas ?? []).map((p) => p.slug).join(", ") || "none",
      transcript: formatTranscript(utterances, speakerMap),
    });
    const skillSlugs = new Set([...(skills ?? []).map((s) => s.slug), "compliance"]);
    const note = await withRetry(async (hint) => {
      const raw = await callClaude({ system, messages: [{ role: "user", content: `Write the coaching note.${hint}` }], model: prompt.model || MODELS.main, maxTokens: 3000 });
      const parsed = CoachingNoteSchema.parse(extractJson(raw));
      parsed.moments.sort((a, b) => a.t_start - b.t_start);
      const unknown = parsed.moments.find((m) => !skillSlugs.has(m.skill));
      if (unknown) throw new Error(`unknown skill slug "${unknown.skill}"`);
      return parsed;
    });

    // 7. Store the draft and its flags, then put it in Chase's queue.
    await admin.from("coaching_notes").delete().eq("recording_id", recordingId).eq("status", "draft");
    const { data: inserted, error } = await admin
      .from("coaching_notes")
      .insert({
        recording_id: recordingId,
        profile_id: rec.profile_id,
        status: "draft",
        ai_output: note,
        overall_score: Math.round(note.overall_score),
        prompt_version_id: prompt.id,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Couldn't save the coaching note");
    await admin.from("flags").delete().eq("source_type", "recording").eq("source_id", recordingId);
    const flags = note.moments
      .filter((m) => m.severity !== "good")
      .map((m) => ({ profile_id: rec.profile_id, source_type: "recording", source_id: recordingId, t_start: m.t_start, t_end: m.t_end, skill_slug: m.skill, severity: m.severity, note: m.what_happened }));
    if (flags.length) await admin.from("flags").insert(flags);

    await setStatus(recordingId, "awaiting_review");
    await logJob(recordingId, "done");
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 500) : "Analysis failed";
    await setStatus(recordingId, "failed", msg);
    await logJob(recordingId, "failed", msg);
  }
}

// ───────────── Helpers ─────────────

async function withRetry<T>(fn: (hint: string) => Promise<T>): Promise<T> {
  try {
    return await fn("");
  } catch (e) {
    const why = e instanceof Error ? e.message.slice(0, 200) : "invalid reply";
    return fn(` Your last reply was invalid (${why}). Return only the JSON.`);
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Masks homeowner names/places the triage step found, plus any phone numbers and emails. */
export function redact(utterances: Utterance[], names: string[]): Utterance[] {
  const words = names
    .map((n) => n.trim())
    .filter((n) => n.length >= 2)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const nameRe = words.length ? new RegExp(`\\b(${words.join("|")})\\b`, "gi") : null;
  return utterances.map((u) => {
    let text = u.text
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
      .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]");
    if (nameRe) text = text.replace(nameRe, "[name]");
    return { ...u, text };
  });
}

export function speakerLabel(speaker: number, map: SpeakerMap | null) {
  if (!map) return `Speaker ${speaker + 1}`;
  if (map.rep.includes(speaker)) return "Rep";
  if (map.homeowner.includes(speaker)) return "Homeowner";
  return "Other";
}

export function formatTranscript(utterances: Utterance[], map: SpeakerMap | null) {
  return utterances.map((u) => `[${Math.round(u.start)}s] ${speakerLabel(u.speaker, map)}: ${u.text}`).join("\n");
}
