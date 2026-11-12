import { createClient } from "@/lib/supabase/server";
import { isStaff, type Profile } from "@/lib/auth";
import { TEAM_TZ, trackDay } from "@/lib/dates";

export type TaskKind = "lesson" | "quiz" | "roleplay" | "field_task" | "reflection" | "workbook";

export type Task = {
  id: string;
  position: number;
  kind: TaskKind;
  ref_id: string | null;
  title: string;
  instructions: string | null;
  est_minutes: number | null;
  required: boolean;
  day_number: number;
  week_number: number;
};

export type Day = { id: string; day_number: number; title: string | null; week_number: number; tasks: Task[] };
export type Week = {
  id: string;
  number: number;
  title: string;
  goal: string | null;
  assessment_quiz_id: string | null;
  days: Day[];
};

/** Task kinds that work in the app today. Role play opens with the practice engine. */
export const LIVE_KINDS: TaskKind[] = ["lesson", "quiz", "field_task", "reflection"];
export const isLive = (t: Pick<Task, "kind">) => LIVE_KINDS.includes(t.kind);

export type DayState = "done" | "today" | "open" | "missed" | "upcoming" | "locked";

export type TrackView = {
  track: { id: string; slug: string; name: string; total_days: number };
  weeks: Week[];
  currentDay: number;
  done: Set<string>;
  progress: Map<string, { status: string; data: unknown; completed_at: string | null }>;
  unlockedWeeks: Set<number>;
  previewMode: boolean; // staff viewing the rep side
  streak: number;
  dayState: (d: Day) => DayState;
  canOpenDay: (dayNumber: number) => boolean;
  findTask: (taskId: string) => Task | undefined;
  dayOf: (n: number) => Day | undefined;
  weekOf: (n: number) => Week | undefined;
};

/** Loads the signed-in person's track with progress and unlock rules applied. Null if no track. */
export async function loadTrack(profile: Profile): Promise<TrackView | null> {
  const supabase = await createClient();
  const staff = isStaff(profile.role);

  let trackId = profile.track_id;
  if (!trackId && staff) {
    const { data } = await supabase.from("tracks").select("id").eq("slug", "new-setter").maybeSingle();
    trackId = data?.id ?? null;
  }
  if (!trackId) return null;

  const [{ data: track }, { data: weekRows }, { data: progressRows }, { data: unlockRows }] = await Promise.all([
    supabase.from("tracks").select("id, slug, name, total_days").eq("id", trackId).single(),
    supabase
      .from("weeks")
      .select("id, number, title, goal, assessment_quiz_id, days(id, day_number, title, tasks(id, position, kind, ref_id, title, instructions, est_minutes, required))")
      .eq("track_id", trackId)
      .order("number"),
    supabase.from("task_progress").select("task_id, status, data, completed_at").eq("profile_id", profile.id),
    supabase.from("week_unlocks").select("week_id").eq("profile_id", profile.id),
  ]);
  if (!track || !weekRows) return null;

  type RawTask = Omit<Task, "day_number" | "week_number">;
  type RawDay = { id: string; day_number: number; title: string | null; tasks: RawTask[] };
  type RawWeek = Omit<Week, "days"> & { days: RawDay[] };

  const weeks: Week[] = (weekRows as unknown as RawWeek[]).map((w) => ({
    ...w,
    days: [...w.days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({
        id: d.id,
        day_number: d.day_number,
        title: d.title,
        week_number: w.number,
        tasks: [...d.tasks]
          .sort((a, b) => a.position - b.position)
          .map((t) => ({ ...t, day_number: d.day_number, week_number: w.number })),
      })),
  }));

  const progress = new Map((progressRows ?? []).map((p) => [p.task_id as string, p]));
  const done = new Set((progressRows ?? []).filter((p) => p.status === "done").map((p) => p.task_id as string));

  // Weekly assessments passed by this person
  const assessmentIds = weeks.map((w) => w.assessment_quiz_id).filter(Boolean) as string[];
  const passed = new Set<string>();
  if (assessmentIds.length) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("profile_id", profile.id)
      .eq("passed", true)
      .in("quiz_id", assessmentIds);
    (attempts ?? []).forEach((a) => passed.add(a.quiz_id as string));
  }
  const overrides = new Set((unlockRows ?? []).map((u) => u.week_id as string));

  const unlockedWeeks = new Set<number>();
  weeks.forEach((w, i) => {
    const prev = weeks[i - 1];
    const open = staff || w.number === 1 || overrides.has(w.id) || !prev?.assessment_quiz_id || passed.has(prev.assessment_quiz_id);
    if (open) unlockedWeeks.add(w.number);
  });

  const startedOn = profile.track_started_on;
  const currentDay = trackDay(startedOn, track.total_days);
  const allDays = weeks.flatMap((w) => w.days);
  const dayOf = (n: number) => allDays.find((d) => d.day_number === n);
  const weekOf = (n: number) => weeks.find((w) => w.number === n);

  const requiredLive = (d: Day) => d.tasks.filter((t) => t.required && isLive(t));
  const dayDone = (d: Day) => {
    const req = requiredLive(d);
    return req.length > 0 && req.every((t) => done.has(t.id));
  };
  const canOpenDay = (n: number) => {
    const d = dayOf(n);
    if (!d) return false;
    if (staff) return true;
    return n <= currentDay && unlockedWeeks.has(d.week_number);
  };
  const dayState = (d: Day): DayState => {
    if (!unlockedWeeks.has(d.week_number)) return "locked";
    if (dayDone(d)) return "done";
    if (d.day_number === currentDay) return "today";
    if (d.day_number < currentDay) return "missed";
    return staff ? "open" : "upcoming";
  };

  return {
    track,
    weeks,
    currentDay,
    done,
    progress,
    unlockedWeeks,
    previewMode: staff && !profile.track_id,
    streak: computeStreak((progressRows ?? []).map((p) => p.completed_at).filter(Boolean) as string[]),
    dayState,
    canOpenDay,
    findTask: (id) => allDays.flatMap((d) => d.tasks).find((t) => t.id === id),
    dayOf,
    weekOf,
  };
}

/** Consecutive Pacific-time days with at least one completed task, ending today (or yesterday). */
export function computeStreak(completedAts: string[], now = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TEAM_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const days = new Set(completedAts.map((t) => fmt.format(new Date(t))));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(fmt.format(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(fmt.format(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export const KIND_LABEL: Record<TaskKind, string> = {
  lesson: "Lesson",
  quiz: "Quiz",
  roleplay: "Practice",
  field_task: "Field",
  reflection: "Reflect",
  workbook: "Workbook",
};
