// The team works in Southern California, so "today" means Pacific time everywhere in the app.
export const TEAM_TZ = "America/Los_Angeles";

/** YYYY-MM-DD for today in Pacific time. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TEAM_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Day of the track (1-based), capped at totalDays. Day 1 = the day the rep finished intake. */
export function trackDay(startedOn: string | null, totalDays = 60, now: Date = new Date()): number {
  if (!startedOn) return 1;
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  const today = Date.parse(`${todayISO(now)}T00:00:00Z`);
  const day = Math.floor((today - start) / 86_400_000) + 1;
  return Math.min(Math.max(day, 1), totalDays);
}
