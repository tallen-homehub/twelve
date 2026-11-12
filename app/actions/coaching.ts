"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callClaude, extractJson, MODELS } from "@/lib/ai/claude";
import { fill, getPrompt } from "@/lib/ai/prompts";
import { todayISO } from "@/lib/dates";
import { addDays, loadDashboard, weekStartOf } from "@/lib/dashboard";

// These return { ok, message } instead of throwing: production hides thrown messages.
export type Result = { ok: boolean; message: string; value?: string };
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof Error ? e.message : "That didn't work." });
const coachRoles = ["leader", "coach", "admin"] as const;

/** Rep logs (or fixes) their numbers for today or the last two days. */
export async function saveDailyLog(input: { date: string; doors?: number; convos?: number; appts?: number; sits?: number; closes?: number; note?: string }): Promise<Result> {
  try {
    const me = await requireProfile();
    const today = todayISO();
    if (input.date < addDays(today, -2) || input.date > today) return { ok: false, message: "You can log today or fix the last two days." };
    const n = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
    const supabase = await createClient();
    const { error } = await supabase.from("daily_logs").upsert(
      {
        profile_id: me.id,
        log_date: input.date,
        doors: n(input.doors, 1000),
        convos: n(input.convos, 1000),
        appts: n(input.appts, 200),
        sits: n(input.sits, 100),
        closes: n(input.closes, 100),
        note: (input.note ?? "").trim().slice(0, 280) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,log_date" },
    );
    if (error) throw new Error(`Couldn't save: ${error.message}`);
    revalidatePath("/today");
    return { ok: true, message: "Logged." };
  } catch (e) {
    return fail(e);
  }
}

/** Sets this week's focus for a rep (staff, or the rep's team leader; RLS checks). */
export async function setFocus(repId: string, focus: string, suggested?: string | null): Promise<Result> {
  try {
    const me = await requireProfile({ roles: [...coachRoles] });
    const text = focus.trim().slice(0, 300);
    if (!text) return { ok: false, message: "Write the focus first." };
    const supabase = await createClient();
    const { error } = await supabase.from("weekly_focus").upsert(
      { profile_id: repId, week_start: weekStartOf(todayISO()), focus: text, suggested: suggested ?? null, set_by: me.id, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,week_start" },
    );
    if (error) throw new Error(error.message.includes("row-level") ? "You can only set focus for your own reps." : error.message);
    revalidatePath("/dashboard");
    revalidatePath("/team");
    return { ok: true, message: "Focus set." };
  } catch (e) {
    return fail(e);
  }
}

const FocusSchema = z.object({ focus: z.string().min(3).max(200), why: z.string().max(300).optional() });

/** AI-suggested focus from the rep's numbers, weakest skills and recent fixes. */
export async function suggestFocus(repId: string): Promise<Result> {
  try {
    await requireProfile({ roles: [...coachRoles] });
    const dash = await loadDashboard();
    const r = dash.reps.find((x) => x.id === repId);
    if (!r) return { ok: false, message: "Rep not found." };
    const pct = (x: number | null) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
    const t = r.thisWeek;
    const l = r.lastWeek;
    const numbers = [
      `This week: ${t.doors} doors, ${t.convos} convos, ${t.appts} appts set, ${t.sits} sits, ${t.closes} closes. Last week: ${l.doors} doors, ${l.convos} convos, ${l.appts} appts, ${l.sits} sits, ${l.closes} closes.`,
      `Team middle: talk rate ${pct(dash.medians.convoRate)}, set rate ${pct(dash.medians.setRate)}, close rate ${pct(dash.medians.closeRate)}.`,
      `Coach-here flag: ${r.coachHere.label} ${r.coachHere.detail}`.trim(),
      `Practice score avg this week: ${r.rpAvg ?? "none"} (last week ${r.rpAvgLast ?? "none"}). Training ${r.trainingPct ?? "n/a"}% done.`,
    ].join("\n");
    const prompt = await getPrompt("focus_suggest");
    const system = fill(prompt.body, {
      rep_name: r.first,
      rep_type: r.repType?.replace("_", "-") ?? "rep",
      day: r.day,
      numbers,
      skills: r.weakSkills.length ? r.weakSkills.map((s) => `${s.name}: ${s.avg.toFixed(1)}`).join("\n") : "(no practice scores yet)",
      fixes: r.lastFixes.length ? r.lastFixes.map((f) => `- ${f}`).join("\n") : "(none yet)",
      last_focus: r.lastFocus ?? "(none)",
    });
    let out: z.infer<typeof FocusSchema> | null = null;
    for (let i = 0; i < 2 && !out; i++) {
      try {
        const raw = await callClaude({ system, messages: [{ role: "user", content: "Suggest this week's focus." }], model: prompt.model || MODELS.fast, maxTokens: 300 });
        out = FocusSchema.parse(extractJson(raw));
      } catch {}
    }
    if (!out) return { ok: false, message: "Couldn't come up with a suggestion. Write one yourself." };
    return { ok: true, message: out.why ?? "", value: out.focus };
  } catch (e) {
    return fail(e);
  }
}

/** Logs a 1:1, ride-along or call. */
export async function markCoached(repId: string, kind: string, note: string): Promise<Result> {
  try {
    const me = await requireProfile({ roles: [...coachRoles] });
    const supabase = await createClient();
    const k = ["1on1", "ride_along", "call", "other"].includes(kind) ? kind : "1on1";
    const { error } = await supabase.from("coaching_touches").insert({ profile_id: repId, coach_id: me.id, kind: k, note: note.trim().slice(0, 1000) || null });
    if (error) throw new Error(error.message.includes("row-level") ? "You can only log coaching for your own reps." : error.message);
    revalidatePath("/dashboard");
    revalidatePath("/team");
    return { ok: true, message: "Logged." };
  } catch (e) {
    return fail(e);
  }
}
