import "server-only";
import { z } from "zod";
import { callClaude, extractJson, MODELS } from "@/lib/ai/claude";
import { fill, getPrompt } from "@/lib/ai/prompts";
import { todayISO } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Team themes (spec 8.3): last 7 days of practice scores, coached recordings and flags →
 * the weakest skills, the share of reps affected, example moments, and a training topic.
 * Numbers are computed here; the AI only writes the words. Runs nightly and on demand.
 */

export type ThemeExample = { kind: "roleplay" | "recording"; rep: string; repId: string; text: string; href: string; t?: number | null };
export type Theme = {
  skill: string;
  skillName: string;
  headline: string;
  why: string;
  topic: string;
  drill: string[];
  line: string;
  share: number; // 0–1 of reps with data on this skill who are weak at it
  weakReps: { id: string; name: string }[];
  repsWithData: number;
  avg: number; // 1–5
  byType: { setters?: number; closers?: number }; // share among setters / closers
  examples: ThemeExample[];
  personaSlug: string | null;
};
export type ThemesData = { generated_at: string; period: { start: string; end: string }; themes: Theme[]; reps: number; sessions: number; note?: string; prompt_version_id?: string };

const OutSchema = z.object({
  themes: z
    .array(
      z.object({
        skill: z.string(),
        headline: z.string().max(140),
        why: z.string().max(500),
        topic: z.string().max(80),
        drill: z.array(z.string().max(220)).min(1).max(4),
        line: z.string().max(240),
        examples: z.array(z.number()).max(3).default([]),
      }),
    )
    .min(1)
    .max(4),
});

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type SkillStat = { slug: string; scores: Map<string, number[]>; examples: (ThemeExample & { score: number })[] };

/** Builds and stores themes for one scope: the whole team (leaderId null) or one team leader's reps. */
export async function generateThemes(leaderId: string | null): Promise<ThemesData> {
  const admin = createAdminClient();
  const end = todayISO();
  const start = addDays(end, -6);
  const since = `${start}T00:00:00-08:00`;

  let repQ = admin.from("profiles").select("id, full_name, preferred_name, rep_type").eq("role", "rep").eq("status", "active");
  if (leaderId) repQ = repQ.eq("leader_id", leaderId);
  const { data: reps } = await repQ;
  const repMap = new Map((reps ?? []).map((r) => [r.id, r]));
  const ids = [...repMap.keys()];
  const base: ThemesData = { generated_at: new Date().toISOString(), period: { start, end }, themes: [], reps: ids.length, sessions: 0 };
  if (!ids.length) return save(leaderId, { ...base, note: "No active reps in this scope yet." });

  const [{ data: sessions }, { data: notes }, { data: skills }, { data: personas }] = await Promise.all([
    admin.from("roleplay_sessions").select("id, profile_id, persona:personas(slug, setting), score:roleplay_scores(per_skill)").in("profile_id", ids).eq("status", "scored").gte("started_at", since),
    admin.from("coaching_notes").select("profile_id, recording_id, final_output, ai_output").in("profile_id", ids).eq("status", "released").gte("reviewed_at", since),
    admin.from("skills").select("slug, name, stage"),
    admin.from("personas").select("slug, setting, difficulty").eq("published", true),
  ]);
  const skillName = new Map((skills ?? []).map((s) => [s.slug, s.name]));
  const first = (id: string) => {
    const r = repMap.get(id);
    return r?.preferred_name || r?.full_name?.replace(/^Demo /, "").split(" ")[0] || "Rep";
  };

  const stats = new Map<string, SkillStat>();
  const stat = (slug: string) => {
    if (!stats.has(slug)) stats.set(slug, { slug, scores: new Map(), examples: [] });
    return stats.get(slug)!;
  };
  for (const s of sessions ?? []) {
    const sc = (Array.isArray(s.score) ? s.score[0] : s.score) as { per_skill: Record<string, { score: number; reason: string }> } | null;
    for (const [slug, v] of Object.entries(sc?.per_skill ?? {})) {
      const st = stat(slug);
      st.scores.set(s.profile_id, [...(st.scores.get(s.profile_id) ?? []), v.score]);
      if (v.score <= 2 && v.reason && !/^Demo/.test(v.reason)) st.examples.push({ kind: "roleplay", rep: first(s.profile_id), repId: s.profile_id, text: v.reason, href: `/practice/session/${s.id}/results`, score: v.score });
    }
  }
  for (const n of notes ?? []) {
    const out = (n.final_output ?? n.ai_output) as { per_skill?: Record<string, number>; moments?: { skill: string; severity: string; what_happened: string; t_start: number }[] } | null;
    for (const [slug, v] of Object.entries(out?.per_skill ?? {})) {
      const st = stat(slug);
      st.scores.set(n.profile_id, [...(st.scores.get(n.profile_id) ?? []), v]);
    }
    for (const m of out?.moments ?? []) {
      if (m.severity === "good") continue;
      stat(m.skill).examples.push({ kind: "recording", rep: first(n.profile_id), repId: n.profile_id, text: m.what_happened, href: `/queue/${n.recording_id}`, t: m.t_start, score: m.severity === "red" ? 1 : 2 });
    }
  }
  base.sessions = (sessions ?? []).length + (notes ?? []).length;

  // Rank skills: share of reps weak (avg < 3), then lowest average. Need at least 2 reps with data.
  const ranked = [...stats.values()]
    .map((st) => {
      const perRep = [...st.scores.entries()].map(([id, xs]) => ({ id, avg: xs.reduce((a, b) => a + b, 0) / xs.length }));
      const weak = perRep.filter((p) => p.avg < 3);
      const typeShare = (pred: (t: string | null) => boolean) => {
        const pool = perRep.filter((p) => pred(repMap.get(p.id)?.rep_type ?? null));
        return pool.length >= 2 ? pool.filter((p) => p.avg < 3).length / pool.length : undefined;
      };
      return {
        st,
        perRep,
        weak,
        share: perRep.length ? weak.length / perRep.length : 0,
        avg: perRep.length ? perRep.reduce((a, p) => a + p.avg, 0) / perRep.length : 5,
        byType: { setters: typeShare((t) => t !== "closer"), closers: typeShare((t) => t === "closer" || t === "self_gen") },
      };
    })
    .filter((x) => x.perRep.length >= 2 && x.weak.length >= 1)
    .sort((a, b) => b.share - a.share || a.avg - b.avg)
    .slice(0, 6);

  if (!ranked.length) return save(leaderId, { ...base, note: "Not enough scored practice or coached recordings this week yet. Themes show up once at least two reps have scores on the same skill." });

  // Examples numbered across skills for the prompt.
  const exampleList: (ThemeExample & { skill: string })[] = [];
  for (const r of ranked) for (const e of r.st.examples.sort((a, b) => a.score - b.score).slice(0, 4)) exampleList.push({ ...e, skill: r.st.slug });
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const prompt = await getPrompt("team_themes");
  const system = fill(prompt.body, {
    scope: leaderId ? `team leader ${first(leaderId)}'s team` : "the whole TWELVE team",
    period: `${start} to ${end}`,
    skills: ranked
      .map((r) => `- ${r.st.slug} (${skillName.get(r.st.slug) ?? r.st.slug}): ${r.weak.length} of ${r.perRep.length} reps weak (${pct(r.share)}), team avg ${r.avg.toFixed(1)}/5${r.byType.setters != null ? `, setters ${pct(r.byType.setters)}` : ""}${r.byType.closers != null ? `, closers ${pct(r.byType.closers)}` : ""}`)
      .join("\n"),
    examples: exampleList.length ? exampleList.map((e, i) => `[${i + 1}] (${e.skill}, ${e.kind}, ${e.rep}) ${e.text}`).join("\n") : "(no written examples this week)",
  });

  let out: z.infer<typeof OutSchema> | null = null;
  let lastErr = "";
  for (let i = 0; i < 2 && !out; i++) {
    try {
      const raw = await callClaude({ system, messages: [{ role: "user", content: `Write this week's themes.${i ? ` Your last reply was invalid (${lastErr}). Return only the JSON.` : ""}` }], model: prompt.model || MODELS.main, maxTokens: 2000 });
      out = OutSchema.parse(extractJson(raw));
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 150) : "invalid";
    }
  }
  if (!out) throw new Error(`Couldn't write themes: ${lastErr}`);

  const bySlug = new Map(ranked.map((r) => [r.st.slug, r]));
  const themes: Theme[] = out.themes
    .filter((t) => bySlug.has(t.skill))
    .slice(0, 3)
    .map((t) => {
      const r = bySlug.get(t.skill)!;
      const stage = (skills ?? []).find((s) => s.slug === t.skill)?.stage;
      const persona = (personas ?? []).filter((p) => p.setting === (stage === "table" ? "table" : "door")).sort((a, b) => a.difficulty - b.difficulty)[1] ?? null;
      const picked = t.examples.map((n) => exampleList[n - 1]).filter((e) => e && e.skill === t.skill);
      const fallback = exampleList.filter((e) => e.skill === t.skill);
      return {
        skill: t.skill,
        skillName: skillName.get(t.skill) ?? t.skill,
        headline: t.headline,
        why: t.why,
        topic: t.topic,
        drill: t.drill,
        line: t.line,
        share: r.share,
        weakReps: r.weak.map((w) => ({ id: w.id, name: first(w.id) })),
        repsWithData: r.perRep.length,
        avg: Math.round(r.avg * 10) / 10,
        byType: r.byType,
        examples: (picked.length ? picked : fallback).slice(0, 2).map((e) => ({ kind: e.kind, rep: e.rep, repId: e.repId, text: e.text, href: e.href, t: e.t ?? null })),
        personaSlug: persona?.slug ?? null,
      };
    });
  return save(leaderId, { ...base, themes, prompt_version_id: prompt.id });
}

async function save(leaderId: string | null, data: ThemesData) {
  await createAdminClient().from("themes").insert({ scope: leaderId ? "leader" : "team", leader_id: leaderId, period_start: data.period.start, period_end: data.period.end, data });
  return data;
}

/** Whole team plus every team leader's team. */
export async function generateAllThemes() {
  const { data: leaders } = await createAdminClient().from("profiles").select("id").eq("role", "leader").eq("status", "active");
  const results = [await generateThemes(null)];
  for (const l of leaders ?? []) {
    try {
      results.push(await generateThemes(l.id));
    } catch {}
  }
  return results.length;
}
