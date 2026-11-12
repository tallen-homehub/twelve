import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { DAILY_VOICE_CAP_S } from "@/lib/roleplay";
import { PhotoHero, PHOTOS, Ring } from "@/components/editorial";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: personas }, { data: runs }] = await Promise.all([
    supabase.from("personas").select("slug, name, setting, difficulty, opening_line, backstory").eq("published", true).order("setting").order("difficulty"),
    supabase
      .from("roleplay_sessions")
      .select("id, started_at, mode, voice_seconds, persona:personas(slug, name), score:roleplay_scores(overall)")
      .eq("profile_id", profile.id)
      .in("status", ["scored", "ended"])
      .order("started_at", { ascending: false })
      .limit(60),
  ]);

  type Run = { id: string; started_at: string; mode: string; voice_seconds: number | null; persona: { slug: string; name: string } | null; score: { overall: number } | { overall: number }[] | null };
  const list = (runs ?? []) as unknown as Run[];
  const scoreOf = (r: Run) => (Array.isArray(r.score) ? r.score[0]?.overall : r.score?.overall) ?? null;
  const best = new Map<string, number>();
  for (const r of list) {
    const s = scoreOf(r);
    if (s != null && r.persona) best.set(r.persona.slug, Math.max(best.get(r.persona.slug) ?? 0, s));
  }
  const today = todayISO();
  const voiceUsed = list.filter((r) => r.started_at >= `${today}T00:00:00-08:00`).reduce((n, r) => n + (r.voice_seconds ?? 0), 0);
  const voiceMin = Math.round(voiceUsed / 60);
  const capMin = DAILY_VOICE_CAP_S / 60;

  const groups = [
    { key: "door", label: "At the door" },
    { key: "table", label: "At the table" },
  ];

  return (
    <>
      <PhotoHero src={PHOTOS.runner} className="mb-4 h-[380px]" position="50% 40%" priority>
        <div className="safe-top flex items-start justify-between pt-4">
          <Logo width={104} />
          <p className="text-right text-[10px] leading-snug font-semibold">
            AI ROLE PLAY
            <br />
            {(personas ?? []).length} HOMEOWNERS
          </p>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <p className="eyebrow">Practice</p>
          {/* TODO-VOICE */}
          <h1 className="mt-1 font-cond text-[84px]">
            Reps
            <br />
            before reps.
          </h1>
        </div>
      </PhotoHero>

      <div className="mb-8 flex items-center gap-4 rounded-sm bg-charcoal px-4 py-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs">
            <span className="label">Voice today</span>
            <span className="text-muted">Text is unlimited</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-charcoal-2">
            <div className="h-full rounded-full bg-tan shadow-[0_0_12px_rgb(205_191_166/0.7)]" style={{ width: `${Math.min(100, (voiceMin / capMin) * 100)}%` }} />
          </div>
        </div>
        <p className="shrink-0">
          <span className="font-display text-3xl font-black">{voiceMin}</span>
          <span className="text-sm text-muted"> / {capMin} min</span>
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-3 font-cond text-[34px]">{g.label}</h2>
            <div className="flex flex-col gap-2.5">
              {(personas ?? [])
                .filter((p) => p.setting === g.key)
                .map((p) => {
                  const b = best.get(p.slug);
                  return (
                    <Link key={p.slug} href={`/practice/${p.slug}`} className="flex items-center gap-4 rounded-sm bg-charcoal p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[22px] leading-tight font-black uppercase">{p.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">&ldquo;{p.opening_line}&rdquo;</p>
                        <div className="mt-2 flex gap-1" aria-label={`Difficulty ${p.difficulty} of 5`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={`h-1.5 w-6 rounded-full ${i <= p.difficulty ? "bg-tan" : "bg-charcoal-2"}`} />
                          ))}
                        </div>
                      </div>
                      {b != null ? (
                        <Ring value={b / 100} size={60} stroke={10} tone={b >= 70 ? "good" : "warn"}>
                          <span className="font-display text-lg font-black">{b}</span>
                        </Ring>
                      ) : (
                        <span className="shrink-0 text-xs font-bold tracking-widest text-tan uppercase">New</span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </section>
        ))}

        {list.some((r) => scoreOf(r) != null) && (
          <section>
            <h2 className="mb-3 font-cond text-[34px]">Your recent runs</h2>
            <div className="flex flex-col gap-2">
              {list
                .filter((r) => scoreOf(r) != null)
                .slice(0, 5)
                .map((r) => (
                  <Link key={r.id} href={`/practice/session/${r.id}/results`} className="flex min-h-12 items-center justify-between rounded-sm bg-charcoal px-4 py-3">
                    <span className="truncate">
                      {r.persona?.name} <span className="text-xs text-muted">· {r.mode}</span>
                    </span>
                    <span className="font-display text-2xl font-black text-tan">{scoreOf(r)}</span>
                  </Link>
                ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
