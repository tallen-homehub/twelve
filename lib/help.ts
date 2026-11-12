import "server-only";
import { z } from "zod";
import { callClaude, extractJson, MODELS } from "@/lib/ai/claude";
import { fill, getPrompt } from "@/lib/ai/prompts";
import { firstName, type Profile } from "@/lib/auth";
import { searchBrain, type BrainHit } from "@/lib/brain";
import { loadTrack } from "@/lib/curriculum";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Help chat: one thread per rep. The AI answers from the brain; it hands off to the TWELVE leadership team when it can't. */

export type ChatMessage = { id: string; sender_type: "rep" | "ai" | "staff" | "system"; body: string; created_at: string; sender_name?: string | null; sources?: { title: string; url: string | null }[] | null };
export type Thread = { id: string; profile_id: string; status: "ai" | "escalated" };

export const ESCALATED_NOTE = "The TWELVE leadership team has been added to this chat. They'll answer right here.";

const AgentSchema = z.object({
  reply: z.string().min(1),
  escalate: z.boolean(),
  reason: z.string().nullable().optional(),
  used: z.array(z.number()).optional(),
});

/** The rep's thread, created on first visit. */
export async function getOrCreateThread(profileId: string): Promise<Thread> {
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select("id, profile_id, status").eq("profile_id", profileId).maybeSingle();
  if (data) return data as Thread;
  const { data: created, error } = await supabase.from("threads").insert({ profile_id: profileId }).select("id, profile_id, status").single();
  if (created) return created as Thread;
  // Two tabs racing to create it: read again.
  const { data: again } = await supabase.from("threads").select("id, profile_id, status").eq("profile_id", profileId).maybeSingle();
  if (!again) throw new Error(error?.message ?? "Couldn't open the chat.");
  return again as Thread;
}

export async function listMessages(threadId: string, limit = 200): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_type, body, created_at, sources, sender:profiles(full_name, preferred_name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []).map((m) => {
    const s = m.sender as unknown as { full_name: string; preferred_name: string | null } | null;
    return { id: m.id, sender_type: m.sender_type, body: m.body, created_at: m.created_at, sources: m.sources as ChatMessage["sources"], sender_name: s ? firstName(s) : null };
  });
}

/** Moves the thread to leadership and drops a note in the chat. */
export async function escalate(threadId: string, reason: string) {
  const admin = createAdminClient();
  const { data: t } = await admin.from("threads").select("status").eq("id", threadId).single();
  if (t?.status === "escalated") return;
  await admin.from("threads").update({ status: "escalated", escalated_at: new Date().toISOString(), escalation_reason: reason.slice(0, 300), staff_read_at: new Date(0).toISOString() }).eq("id", threadId);
  await admin.from("messages").insert({ thread_id: threadId, sender_type: "system", body: ESCALATED_NOTE });
}

async function repContext(profile: Profile) {
  try {
    const view = await loadTrack(profile);
    if (!view) return { text: "No training track assigned yet.", track: "no", day: 1 };
    const locked = view.weeks.filter((w) => !view.unlockedWeeks.has(w.number)).map((w) => w.number);
    const today = view.dayOf(view.currentDay);
    const todayTasks = today?.tasks.map((t) => `${t.title} (${view.done.has(t.id) ? "done" : "not done"})`).join("; ") ?? "none";
    const text = [
      `Day ${view.currentDay} of ${view.track.total_days}. Tasks done: ${view.done.size}. Streak: ${view.streak} days.`,
      `Unlocked weeks: ${[...view.unlockedWeeks].join(", ") || "none"}. Locked weeks: ${locked.join(", ") || "none"}.`,
      `Today's tasks: ${todayTasks}.`,
    ].join("\n");
    return { text, track: view.track.name, day: view.currentDay };
  } catch {
    return { text: "(couldn't load progress)", track: "their", day: 1 };
  }
}

/** Runs the help agent on the latest rep message and posts its reply (and escalates if needed). */
export async function agentReply(profile: Profile, threadId: string) {
  const admin = createAdminClient();
  const history = await listMessages(threadId, 400);
  const recent = history.slice(-20);
  const last = [...recent].reverse().find((m) => m.sender_type === "rep");
  if (!last) return;

  let hits: BrainHit[] = [];
  try {
    const prior = recent.filter((m) => m.sender_type === "rep").slice(-3).map((m) => m.body).join("\n");
    hits = await searchBrain(prior || last.body, 6);
  } catch {
    hits = [];
  }
  const ctx = await repContext(profile);
  const prompt = await getPrompt("help_agent");
  const system = fill(prompt.body, {
    rep_name: firstName(profile),
    rep_type: profile.rep_type?.replace("_", "-") ?? "rep",
    day: ctx.day,
    track: ctx.track,
    rep_context: ctx.text,
    knowledge: hits.length ? hits.map((h, i) => `[${i + 1}] ${h.title ?? "Note"}\n${h.text}`).join("\n\n---\n\n") : "(nothing relevant found)",
  });
  const convo = recent
    .map((m) => `${m.sender_type === "rep" ? "Rep" : m.sender_type === "ai" ? "You" : m.sender_type === "staff" ? `Leadership (${m.sender_name ?? "staff"})` : "System"}: ${m.body}`)
    .join("\n");

  let out: z.infer<typeof AgentSchema> | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
    try {
      const raw = await callClaude({
        system,
        messages: [{ role: "user", content: `Conversation so far:\n${convo}\n\nReply to the rep's last message.${attempt ? ` Your last reply was invalid (${lastErr}). Return only the JSON.` : ""}` }],
        model: prompt.model || MODELS.fast,
        maxTokens: 700,
      });
      out = AgentSchema.parse(extractJson(raw));
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 150) : "invalid";
    }
  }
  if (!out) {
    await admin.from("messages").insert({ thread_id: threadId, sender_type: "ai", body: "I hit a snag answering that. I'm bringing in the TWELVE leadership team." });
    await escalate(threadId, `Help bot error on: "${last.body.slice(0, 120)}"`);
    return;
  }

  const used = (out.used ?? []).map((n) => hits[n - 1]).filter(Boolean);
  const sources = [...new Map(used.map((h) => [h.title, { title: h.title ?? "Note", url: h.url }])).values()];
  await admin.from("messages").insert({ thread_id: threadId, sender_type: "ai", body: out.reply.slice(0, 4000), sources: sources.length ? sources : null, prompt_version_id: prompt.id });
  if (out.escalate) await escalate(threadId, out.reason || last.body.slice(0, 200));
}
