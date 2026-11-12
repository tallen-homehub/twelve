import "server-only";
import { z } from "zod";
import { callClaude, extractJson, MODELS, type ClaudeMessage } from "@/lib/ai/claude";
import { fill, getPrompt } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";

export type Turn = { role: "rep" | "homeowner"; text: string; t: number };

export type Persona = {
  id: string;
  slug: string;
  name: string;
  setting: "door" | "table";
  difficulty: number;
  backstory: string | null;
  opening_line: string | null;
  objections: string[];
  success_condition: string | null;
  start_trust: number;
  voice_id: string | null;
};

export const PERSONA_FIELDS = "id, slug, name, setting, difficulty, backstory, opening_line, objections, success_condition, start_trust, voice_id";

export const TIME_CAP_S = { door: 6 * 60, table: 20 * 60 } as const;
export const DAILY_VOICE_CAP_S = 30 * 60;
export const DEFAULT_PASS_SCORE = 70;

const SETTING_RULES = {
  door: "You're at your front door. You're busy and give short answers. You look for a reason to close the door.",
  table: "You're at your dining room table after a presentation. You're polite but guarded about money and commitment.",
};

function personaVars(p: Persona) {
  return {
    name: p.name,
    setting_label: p.setting === "door" ? "at the front door" : "at the dining room table",
    setting_rules: SETTING_RULES[p.setting],
    backstory: p.backstory ?? "",
    opening_line: p.opening_line ?? "Hi?",
    objections: (p.objections ?? []).map((o) => `"${o}"`).join(", "),
    start_trust: p.start_trust,
    success_condition: p.success_condition ?? "agree to a next step",
  };
}

/** System prompt for the homeowner. Text mode adds a hidden state tag after every reply. */
export async function homeownerSystem(p: Persona, mode: "text" | "voice") {
  const prompt = await getPrompt("persona_homeowner");
  const base = fill(prompt.body, personaVars(p));
  const suffix =
    mode === "text"
      ? `\n\nOutput format: write only your spoken words. Then, on a new last line, add a hidden tag the rep never sees:
[[state trust=<0-10> end=<yes|no> outcome=<set|closed|lost|none>]]
Use end=yes when you shut the door, leave the table, or agree to the success condition.`
      : `\n\nYou are on a live voice call. Speak naturally and briefly. When you're done (door closed, or you agree), say a short closing line.`;
  return { system: base + suffix, promptVersionId: prompt.id };
}

const STATE_RE = /\[\[state\s+trust=(\d+)\s+end=(yes|no)\s+outcome=(\w+)\]\]/i;

/** Splits the homeowner's reply from its hidden state tag. */
export function parseHomeownerReply(raw: string) {
  const m = raw.match(STATE_RE);
  const text = raw.replace(STATE_RE, "").trim();
  return {
    text,
    trust: m ? Number(m[1]) : null,
    ended: m ? m[2].toLowerCase() === "yes" : false,
    outcome: m && m[3] !== "none" ? m[3].toLowerCase() : null,
  };
}

/** Next homeowner line in a text role play. */
export async function homeownerReply(p: Persona, turns: Turn[]) {
  const { system } = await homeownerSystem(p, "text");
  // The homeowner speaks first (opening line), so the conversation starts with an assistant turn;
  // Claude needs a user turn first, so we add a stage direction.
  const messages: ClaudeMessage[] = [{ role: "user", content: "(The rep knocks / sits down.)" }];
  for (const t of turns) messages.push({ role: t.role === "rep" ? "user" : "assistant", content: t.text });
  const raw = await callClaude({ system, messages, model: MODELS.main, maxTokens: 300, temperature: 0.8 });
  return parseHomeownerReply(raw);
}

export const RoleplayScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  outcome: z.enum(["set", "closed", "lost", "abandoned"]),
  per_skill: z.record(z.string(), z.object({ score: z.number().min(1).max(5), reason: z.string() })),
  top_fix: z.object({ turn: z.number(), text: z.string() }),
  chase_line: z.string(),
  highlights: z.array(z.object({ turn: z.number(), text: z.string() })).max(3),
  compliance_flags: z.array(z.string()),
});
export type RoleplayScore = z.infer<typeof RoleplayScoreSchema>;

export function formatTranscript(turns: Turn[]) {
  return turns.map((t, i) => `${i + 1}. ${t.role === "rep" ? "REP" : "HOMEOWNER"}: ${t.text}`).join("\n");
}

/**
 * Scores a finished session with Claude, stores the score and any compliance flags,
 * and completes the linked task when the score clears its bar. Uses the service role.
 */
export async function scoreSession(sessionId: string) {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("roleplay_sessions")
    .select(`id, profile_id, task_id, mode, turns, persona:personas(${PERSONA_FIELDS})`)
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");
  const persona = session.persona as unknown as Persona;
  const turns = (session.turns ?? []) as Turn[];

  if (!turns.some((t) => t.role === "rep")) {
    await admin.from("roleplay_sessions").update({ status: "ended", outcome: "abandoned" }).eq("id", sessionId);
    return null;
  }

  const { data: skills } = await admin
    .from("skills")
    .select("slug, name, stage, what_good_sounds_like")
    .in("stage", [persona.setting, "mindset", "compliance"])
    .order("position");
  const rubric = (skills ?? []).map((s) => `- ${s.slug}: ${s.name}. ${s.what_good_sounds_like}`).join("\n");

  const prompt = await getPrompt("roleplay_score");
  const system = fill(prompt.body, {
    persona_name: persona.name,
    setting_label: persona.setting === "door" ? "door" : "table",
    success_condition: persona.success_condition ?? "agree to a next step",
    rubric,
    transcript: formatTranscript(turns),
  });

  let score: RoleplayScore | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < 2 && !score; attempt++) {
    try {
      const raw = await callClaude({
        system,
        messages: [{ role: "user", content: attempt === 0 ? "Score this role play." : `Score this role play. Your last reply was invalid (${lastError}). Return only the JSON.` }],
        model: prompt.model || MODELS.main,
        maxTokens: 1500,
        temperature: prompt.temperature,
      });
      score = RoleplayScoreSchema.parse(extractJson(raw));
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 200) : "parse error";
    }
  }
  if (!score) {
    await admin.from("roleplay_sessions").update({ status: "failed" }).eq("id", sessionId);
    throw new Error(`Scoring failed: ${lastError}`);
  }

  await admin.from("roleplay_scores").upsert({
    session_id: sessionId,
    overall: Math.round(score.overall),
    per_skill: score.per_skill,
    top_fix: score.top_fix,
    chase_line: score.chase_line,
    highlights: score.highlights,
    compliance_flags: score.compliance_flags,
    prompt_version_id: prompt.id,
  });
  await admin.from("roleplay_sessions").update({ status: "scored", outcome: score.outcome }).eq("id", sessionId);

  // Red flag for compliance problems and for the main fix on low scores, so Chase sees them.
  const flags = [
    ...score.compliance_flags.map((note) => ({ severity: "red", skill_slug: "honesty", note })),
    ...(score.overall < 50 ? [{ severity: "yellow", skill_slug: null, note: score.top_fix.text }] : []),
  ];
  if (flags.length) {
    await admin.from("flags").insert(flags.map((f) => ({ ...f, profile_id: session.profile_id, source_type: "roleplay", source_id: sessionId })));
  }

  if (session.task_id) await maybeCompleteTask(session.profile_id, session.task_id, Math.round(score.overall), sessionId);
  return score;
}

/** Practice tasks complete on any scored run; the end-of-week assessment role play needs the week's threshold. */
async function maybeCompleteTask(profileId: string, taskId: string, overall: number, sessionId: string) {
  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, day:days(day_number, week:weeks(roleplay_threshold, assessment_quiz_id, days(day_number)))")
    .eq("id", taskId)
    .single();
  if (!task) return;
  const day = task.day as unknown as { day_number: number; week: { roleplay_threshold: number | null; assessment_quiz_id: string | null; days: { day_number: number }[] } };
  const lastDay = Math.max(...day.week.days.map((d) => d.day_number));
  const isAssessment = Boolean(day.week.assessment_quiz_id) && day.day_number === lastDay;
  const bar = isAssessment ? (day.week.roleplay_threshold ?? DEFAULT_PASS_SCORE) : 0;
  if (overall < bar) return;
  const { data: existing } = await admin.from("task_progress").select("status, data").eq("profile_id", profileId).eq("task_id", taskId).maybeSingle();
  const prevBest = (existing?.data as { best_score?: number } | null)?.best_score ?? -1;
  if (existing?.status === "done" && prevBest >= overall) return;
  await admin.from("task_progress").upsert({
    profile_id: profileId,
    task_id: taskId,
    status: "done",
    completed_at: new Date().toISOString(),
    data: { best_score: overall, session_id: sessionId },
  });
}
