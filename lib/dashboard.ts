import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayISO, trackDay } from "@/lib/dates";
import { firstName } from "@/lib/auth";

/**
 * Everything the dashboards show, computed per rep. Reads with the caller's session,
 * so RLS decides scope: staff see everyone, a team leader sees only their reps.
 */

export type Numbers = { doors: number; convos: number; appts: number; sits: number; closes: number };
export type Need = { kind: string; text: string; weight: number };
export type RepRow = {
  id: string;
  name: string;
  first: string;
  repType: string | null;
  leaderId: string | null;
  leaderName: string | null;
  day: number;
  totalDays: number;
  trainingPct: number | null;
  thisWeek: Numbers;
  lastWeek: Numbers;
  loggedToday: boolean;
  loggedYesterday: boolean;
  rpAvg: number | null;
  rpAvgLast: number | null;
  rpCount: number;
  recScore: number | null;
  weakSkills: { slug: string; name: string; avg: number }[];
  lastFixes: string[];
  lastActive: string | null;
  lastCoached: string | null;
  focus: { focus: string; suggested: string | null } | null;
  lastFocus: string | null;
  redFlags: number;
  failedAssessment: boolean;
  coachHere: { label: string; detail: string; tone: "red" | "amber" | "ok" };
  needs: Need[];
};
export type TeamSummary = {
  leaderId: string | null;
  leaderName: string;
  reps: number;
  thisWeek: Numbers;
  lastWeek: Numbers;
  rpAvg: number | null;
  loggedToday: number;
  coached7d: number;
};
export type Medians = { convoRate: number | null; setRate: number | null; closeRate: number | null; rpAvg: number | null };
export type Dashboard = {
  today: string;
  weekStart: string;
  lastWeekStart: string;
  reps: RepRow[];
  teams: TeamSummary[];
  totals: { thisWeek: Numbers; lastWeek: Numbers };
  medians: Medians;
  pulse: { coached7d: number; focusSet: number; loggedToday: number; activeLast3d: number; total: number };
};

const ZERO: Numbers = { doors: 0, convos: 0, appts: 0, sits: 0, closes: 0 };
const KEYS = Object.keys(ZERO) as (keyof Numbers)[];

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Monday of the week containing this date. */
export function weekStartOf(iso: string) {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}
const add = (a: Numbers, b: Partial<Numbers>): Numbers => Object.fromEntries(KEYS.map((k) => [k, a[k] + (b[k] ?? 0)])) as Numbers;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const maxIso = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).sort().at(-1) ?? null;
const daysSince = (iso: string | null, today: string) => (iso ? Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) / 86_400_000) : Infinity);

export const isSetter = (t: string | null) => t !== "closer";
export const isCloser = (t: string | null) => t === "closer" || t === "self_gen";

export async function loadDashboard(opts: { leaderId?: string | null } = {}): Promise<Dashboard> {
  const supabase = await createClient();
  const today = todayISO();
  const weekStart = weekStartOf(today);
  const lastWeekStart = addDays(weekStart, -7);
  const since14 = `${addDays(today, -14)}T00:00:00Z`;
  const since30 = `${addDays(today, -30)}T00:00:00Z`;

  let repQuery = supabase
    .from("profiles")
    .select("id, full_name, preferred_name, rep_type, leader_id, track_id, track_started_on")
    .eq("role", "rep")
    .eq("status", "active")
    .order("full_name");
  if (opts.leaderId) repQuery = repQuery.eq("leader_id", opts.leaderId);
  const [{ data: repRows }, { data: leaders }, { data: skills }, { data: tracks }, { data: dayRows }, { data: assessWeeks }] = await Promise.all([
    repQuery,
    supabase.from("profiles").select("id, full_name, preferred_name").eq("role", "leader"),
    supabase.from("skills").select("slug, name"),
    supabase.from("tracks").select("id, total_days"),
    supabase.from("days").select("day_number, week:weeks(track_id), tasks(id, required, kind)"),
    supabase.from("weeks").select("assessment_quiz_id").not("assessment_quiz_id", "is", null),
  ]);
  const reps = repRows ?? [];
  const ids = reps.map((r) => r.id);
  const skillName = new Map((skills ?? []).map((s) => [s.slug, s.name]));
  const leaderName = new Map((leaders ?? []).map((l) => [l.id, l.preferred_name || l.full_name]));
  const totalDays = new Map((tracks ?? []).map((t) => [t.id, t.total_days ?? 60]));

  // Required, live tasks per track with their day number.
  const LIVE = new Set(["lesson", "quiz", "roleplay", "field_task", "reflection"]);
  const trackTasks = new Map<string, { id: string; day: number }[]>();
  for (const d of dayRows ?? []) {
    const trackId = (d.week as unknown as { track_id: string } | null)?.track_id;
    if (!trackId) continue;
    const list = trackTasks.get(trackId) ?? [];
    for (const t of (d.tasks ?? []) as { id: string; required: boolean; kind: string }[]) if (t.required && LIVE.has(t.kind)) list.push({ id: t.id, day: d.day_number });
    trackTasks.set(trackId, list);
  }
  const assessmentIds = new Set((assessWeeks ?? []).map((w) => w.assessment_quiz_id as string));

  const empty = { data: [] as never[] };
  const [progress, logs, sessions, notes, focus, touches, flags, attempts] = ids.length
    ? await Promise.all([
        supabase.from("task_progress").select("profile_id, task_id, completed_at").in("profile_id", ids).eq("status", "done"),
        supabase.from("daily_logs").select("profile_id, log_date, doors, convos, appts, sits, closes").in("profile_id", ids).gte("log_date", lastWeekStart),
        supabase.from("roleplay_sessions").select("profile_id, started_at, score:roleplay_scores(overall, per_skill, top_fix)").in("profile_id", ids).gte("started_at", since14).eq("status", "scored"),
        supabase.from("coaching_notes").select("profile_id, overall_score, reviewed_at, final_output").in("profile_id", ids).eq("status", "released").gte("reviewed_at", since30).order("reviewed_at", { ascending: false }),
        supabase.from("weekly_focus").select("profile_id, week_start, focus, suggested, created_at, updated_at").in("profile_id", ids).gte("week_start", lastWeekStart),
        supabase.from("coaching_touches").select("profile_id, created_at").in("profile_id", ids).gte("created_at", since30),
        supabase.from("flags").select("profile_id, severity, created_at").in("profile_id", ids).gte("created_at", `${weekStart}T00:00:00-08:00`),
        supabase.from("quiz_attempts").select("profile_id, quiz_id, passed, created_at").in("profile_id", ids).gte("created_at", since30),
      ])
    : [empty, empty, empty, empty, empty, empty, empty, empty];

  const by = <T extends { profile_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) m.set(r.profile_id, [...(m.get(r.profile_id) ?? []), r]);
    return m;
  };
  const progressBy = by(progress.data as { profile_id: string; task_id: string; completed_at: string | null }[]);
  const logsBy = by(logs.data as ({ profile_id: string; log_date: string } & Numbers)[]);
  const sessBy = by(sessions.data as { profile_id: string; started_at: string; score: unknown }[]);
  const notesBy = by(notes.data as { profile_id: string; overall_score: number | null; reviewed_at: string; final_output: unknown }[]);
  const focusBy = by(focus.data as { profile_id: string; week_start: string; focus: string; suggested: string | null; created_at: string; updated_at: string }[]);
  const touchBy = by(touches.data as { profile_id: string; created_at: string }[]);
  const flagsBy = by(flags.data as { profile_id: string; severity: string }[]);
  const attemptsBy = by(attempts.data as { profile_id: string; quiz_id: string; passed: boolean; created_at: string }[]);

  // First pass: raw numbers per rep.
  const rows: RepRow[] = reps.map((r) => {
    const total = totalDays.get(r.track_id ?? "") ?? 60;
    const day = trackDay(r.track_started_on, total);
    const due = (trackTasks.get(r.track_id ?? "") ?? []).filter((t) => t.day <= day);
    const doneIds = new Set((progressBy.get(r.id) ?? []).map((p) => p.task_id));
    const trainingPct = r.track_id && due.length ? Math.round((due.filter((t) => doneIds.has(t.id)).length / due.length) * 100) : null;

    let thisWeek = ZERO;
    let lastWeek = ZERO;
    const repLogs = logsBy.get(r.id) ?? [];
    for (const l of repLogs) {
      if (l.log_date >= weekStart) thisWeek = add(thisWeek, l);
      else lastWeek = add(lastWeek, l);
    }
    const loggedToday = repLogs.some((l) => l.log_date === today);
    const loggedYesterday = repLogs.some((l) => l.log_date === addDays(today, -1));

    type Score = { overall: number; per_skill: Record<string, { score: number }>; top_fix: { text: string } | null };
    const scored = (sessBy.get(r.id) ?? [])
      .map((s) => ({ at: s.started_at, score: (Array.isArray(s.score) ? s.score[0] : s.score) as Score | null }))
      .filter((s): s is { at: string; score: Score } => Boolean(s.score))
      .sort((a, b) => b.at.localeCompare(a.at));
    const wkStartTs = `${weekStart}T00:00:00-08:00`;
    const thisWk = scored.filter((s) => s.at >= wkStartTs);
    const lastWk = scored.filter((s) => s.at < wkStartTs && s.at >= `${lastWeekStart}T00:00:00-08:00`);

    // Weakest skills from role plays (1–5) and released recording notes (1–5), last 2–4 weeks.
    const skillScores = new Map<string, number[]>();
    for (const s of scored) for (const [slug, v] of Object.entries(s.score.per_skill ?? {})) skillScores.set(slug, [...(skillScores.get(slug) ?? []), v.score]);
    const repNotes = notesBy.get(r.id) ?? [];
    for (const n of repNotes) for (const [slug, v] of Object.entries((n.final_output as { per_skill?: Record<string, number> } | null)?.per_skill ?? {})) skillScores.set(slug, [...(skillScores.get(slug) ?? []), v]);
    const weakSkills = [...skillScores.entries()]
      .map(([slug, xs]) => ({ slug, name: skillName.get(slug) ?? (slug === "compliance" ? "Honesty" : slug), avg: xs.reduce((a, b) => a + b, 0) / xs.length }))
      .filter((s) => s.avg < 3.5)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 2);

    const repFocus = focusBy.get(r.id) ?? [];
    const cur = repFocus.find((f) => f.week_start === weekStart);
    const prev = repFocus.find((f) => f.week_start === lastWeekStart);
    const lastCoached = maxIso(
      ...(touchBy.get(r.id) ?? []).map((t) => t.created_at),
      repNotes[0]?.reviewed_at,
      ...repFocus.map((f) => f.updated_at),
    );
    const lastActive = maxIso(
      ...(progressBy.get(r.id) ?? []).map((p) => p.completed_at),
      scored[0]?.at,
      ...repLogs.map((l) => l.log_date),
    );
    const repAttempts = (attemptsBy.get(r.id) ?? []).filter((a) => assessmentIds.has(a.quiz_id));
    const failedAssessment = [...new Set(repAttempts.map((a) => a.quiz_id))].some((q) => {
      const tries = repAttempts.filter((a) => a.quiz_id === q);
      return !tries.some((a) => a.passed);
    });

    return {
      id: r.id,
      name: r.full_name || "Rep",
      first: firstName(r),
      repType: r.rep_type,
      leaderId: r.leader_id,
      leaderName: r.leader_id ? (leaderName.get(r.leader_id) ?? null) : null,
      day,
      totalDays: total,
      trainingPct,
      thisWeek,
      lastWeek,
      loggedToday,
      loggedYesterday,
      rpAvg: avg(thisWk.map((s) => s.score.overall)),
      rpAvgLast: avg(lastWk.map((s) => s.score.overall)),
      rpCount: thisWk.length,
      recScore: repNotes[0]?.overall_score ?? null,
      weakSkills,
      lastFixes: scored.slice(0, 3).map((s) => s.score.top_fix?.text).filter((t): t is string => Boolean(t)),
      lastActive,
      lastCoached,
      focus: cur ? { focus: cur.focus, suggested: cur.suggested } : null,
      lastFocus: prev?.focus ?? null,
      redFlags: (flagsBy.get(r.id) ?? []).filter((f) => f.severity === "red").length,
      failedAssessment,
      coachHere: { label: "On par", detail: "", tone: "ok" },
      needs: [],
    };
  });

  // Team middles over the last two weeks, for "coach here".
  const two = (r: RepRow) => add(r.thisWeek, r.lastWeek);
  const rate = (n: number, d: number) => (d >= 5 ? n / d : null);
  const convoRates = rows.map((r) => rate(two(r).convos, two(r).doors)).filter((x): x is number => x != null);
  const setRates = rows.map((r) => rate(two(r).appts, two(r).convos)).filter((x): x is number => x != null);
  const closeRates = rows.map((r) => rate(two(r).closes, two(r).sits)).filter((x): x is number => x != null);
  const medians: Medians = {
    convoRate: median(convoRates),
    setRate: median(setRates),
    closeRate: median(closeRates),
    rpAvg: median(rows.map((r) => r.rpAvg).filter((x): x is number => x != null)),
  };
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  for (const r of rows) {
    const t = two(r);
    const checks: { label: string; mine: number | null; mid: number | null }[] = [];
    if (isSetter(r.repType)) {
      checks.push({ label: "Talk rate", mine: rate(t.convos, t.doors), mid: medians.convoRate });
      checks.push({ label: "Set rate", mine: rate(t.appts, t.convos), mid: medians.setRate });
    }
    if (isCloser(r.repType)) checks.push({ label: "Close rate", mine: rate(t.closes, t.sits), mid: medians.closeRate });
    const gaps = checks
      .filter((c): c is { label: string; mine: number; mid: number } => c.mine != null && c.mid != null && c.mid > 0)
      .map((c) => ({ ...c, gap: (c.mid - c.mine) / c.mid }))
      .sort((a, b) => b.gap - a.gap);
    const worst = gaps[0];
    if (worst && worst.gap > 0.1) {
      r.coachHere = { label: worst.label, detail: `${pct(worst.mine)} vs team ${pct(worst.mid)}`, tone: worst.gap > 0.25 ? "red" : "amber" };
    } else if (r.weakSkills[0]) {
      r.coachHere = { label: r.weakSkills[0].name, detail: `${r.weakSkills[0].avg.toFixed(1)} of 5 in practice`, tone: r.weakSkills[0].avg < 2.5 ? "red" : "amber" };
    }

    const idle = daysSince(r.lastActive, today);
    const coachedAgo = daysSince(r.lastCoached, today);
    const needs: Need[] = [];
    if (r.redFlags) needs.push({ kind: "flag", text: `${r.redFlags} red flag${r.redFlags > 1 ? "s" : ""} this week`, weight: 100 });
    if (idle >= 3) needs.push({ kind: "idle", text: Number.isFinite(idle) ? `No activity in ${idle} days` : "Hasn't started yet", weight: 90 });
    if (r.failedAssessment) needs.push({ kind: "assessment", text: "Failed a weekly assessment", weight: 80 });
    if (r.rpAvg != null && r.rpAvgLast != null && r.rpAvgLast - r.rpAvg >= 10) needs.push({ kind: "falling", text: `Practice scores down ${r.rpAvgLast - r.rpAvg} pts`, weight: 70 });
    if (!r.focus) needs.push({ kind: "focus", text: "Set this week's focus", weight: 50 });
    if (coachedAgo >= 7) needs.push({ kind: "coach", text: Number.isFinite(coachedAgo) ? `Not coached in ${coachedAgo} days` : "Not coached yet", weight: 40 });
    if (!r.loggedYesterday && r.day > 1) needs.push({ kind: "log", text: "Didn't log numbers yesterday", weight: 20 });
    r.needs = needs.sort((a, b) => b.weight - a.weight);
  }

  // Teams side by side (Chase's view).
  const teamIds = [...new Set(rows.map((r) => r.leaderId))];
  const teams: TeamSummary[] = teamIds
    .map((lid) => {
      const members = rows.filter((r) => r.leaderId === lid);
      return {
        leaderId: lid,
        leaderName: lid ? (leaderName.get(lid) ?? "Team") : "No team leader",
        reps: members.length,
        thisWeek: members.reduce((a, r) => add(a, r.thisWeek), ZERO),
        lastWeek: members.reduce((a, r) => add(a, r.lastWeek), ZERO),
        rpAvg: avg(members.map((r) => r.rpAvg).filter((x): x is number => x != null)),
        loggedToday: members.filter((r) => r.loggedToday).length,
        coached7d: members.filter((r) => daysSince(r.lastCoached, today) < 7).length,
      };
    })
    .sort((a, b) => b.thisWeek.appts + b.thisWeek.closes - (a.thisWeek.appts + a.thisWeek.closes));

  return {
    today,
    weekStart,
    lastWeekStart,
    reps: rows,
    teams,
    totals: { thisWeek: rows.reduce((a, r) => add(a, r.thisWeek), ZERO), lastWeek: rows.reduce((a, r) => add(a, r.lastWeek), ZERO) },
    medians,
    pulse: {
      coached7d: rows.filter((r) => daysSince(r.lastCoached, today) < 7).length,
      focusSet: rows.filter((r) => r.focus).length,
      loggedToday: rows.filter((r) => r.loggedToday).length,
      activeLast3d: rows.filter((r) => daysSince(r.lastActive, today) < 3).length,
      total: rows.length,
    },
  };
}
