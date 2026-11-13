import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ThemesData } from "@/lib/themes";
import { PhotoHero, PHOTOS, Ring } from "@/components/editorial";
import { mmss } from "@/lib/format";
import { RefreshThemes } from "./RefreshThemes";

const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();

/** What to train next: top 3 weak skills, share of reps affected, examples, and a meeting drill. */
export async function ThemesView({
  leaderId,
  staff,
  repHref,
  backHref,
}: {
  leaderId: string | null;
  staff: boolean;
  repHref: (id: string) => string;
  backHref?: string;
}) {
  const supabase = await createClient();
  let q = supabase.from("themes").select("data, created_at").order("created_at", { ascending: false }).limit(1);
  q = leaderId ? q.eq("scope", "leader").eq("leader_id", leaderId) : q.eq("scope", "team");
  const [{ data: row }, { data: leaders }] = await Promise.all([
    q.maybeSingle(),
    staff ? supabase.from("profiles").select("id, full_name").eq("role", "leader").eq("status", "active").order("full_name") : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const d = row?.data as ThemesData | undefined;
  const scopeName = leaderId ? `Team ${(leaders ?? []).find((l) => l.id === leaderId)?.full_name.replace(/^Demo /, "").split(" ")[0] ?? ""}`.trim() : "The whole team";

  return (
    <div className="flex flex-col gap-8 pb-6">
      <PhotoHero src={PHOTOS.cap} className="h-[360px]" position="50% 12%" priority>
        <div className="safe-top flex items-start justify-between pt-4">
          {backHref ? (
            <Link href={backHref} className="flex min-h-11 items-center text-sm text-bone">
              ← Back
            </Link>
          ) : (
            <span />
          )}
          <p className="text-right text-[10px] leading-snug font-semibold">
            {d ? `${fmt(d.period.start)} – ${fmt(d.period.end)}` : "LAST 7 DAYS"}
            <br />
            {scopeName.toUpperCase()}
          </p>
        </div>
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Team themes</p>
            <h1 className="mt-1 font-cond text-[72px]">
              What to
              <br />
              train next.
            </h1>
          </div>
          <RefreshThemes leaderId={leaderId} />
        </div>
      </PhotoHero>

      {staff && (leaders ?? []).length > 0 && (
        <nav aria-label="Scope" className="-mt-4 flex flex-wrap gap-2">
          <Link href="/themes" className={`flex min-h-11 items-center rounded-sm px-4 text-sm font-semibold ${!leaderId ? "bg-bone text-ink" : "bg-charcoal"}`}>
            Whole team
          </Link>
          {(leaders ?? []).map((l) => (
            <Link key={l.id} href={`/themes?leader=${l.id}`} className={`flex min-h-11 items-center rounded-sm px-4 text-sm font-semibold ${leaderId === l.id ? "bg-bone text-ink" : "bg-charcoal"}`}>
              {l.full_name.replace(/^Demo /, "")}
            </Link>
          ))}
        </nav>
      )}

      {!d ? (
        <p className="rounded-sm bg-charcoal p-5 text-muted">No themes yet. Tap &ldquo;Refresh now&rdquo; to read this week, or they&apos;ll appear after tonight&apos;s run.</p>
      ) : !d.themes.length ? (
        <p className="rounded-sm bg-charcoal p-5 text-muted">{d.note}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {d.themes.map((t, i) => (
            <article key={t.skill} className="overflow-hidden rounded-sm bg-charcoal">
              <div className="flex gap-5 p-5">
                <div className="flex flex-col items-center gap-2">
                  <span className="font-cond text-[56px] text-tan">{String(i + 1).padStart(2, "0")}</span>
                  <Ring value={t.share} size={84} stroke={9} tone={t.share >= 0.5 ? "red" : "warn"}>
                    <span className="font-display text-2xl font-black">{Math.round(t.share * 100)}%</span>
                  </Ring>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="label">{t.skillName}</p>
                  <h2 className="mt-1 font-display text-[26px] leading-[1.05] font-black uppercase">{t.headline}</h2>
                  <p className="mt-2 text-sm text-muted">
                    {t.weakReps.length} of {t.repsWithData} reps are weak here (avg {t.avg}/5)
                    {t.byType.setters != null && ` · setters ${Math.round(t.byType.setters * 100)}%`}
                    {t.byType.closers != null && ` · closers ${Math.round(t.byType.closers * 100)}%`}
                  </p>
                  <p className="mt-3">{t.why}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.weakReps.map((r) => (
                      <Link key={r.id} href={repHref(r.id)} className="flex min-h-9 items-center rounded-sm bg-charcoal-2 px-2.5 text-xs font-semibold">
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {t.examples.length > 0 && (
                <ul className="border-t border-charcoal-2 px-5 py-3">
                  {t.examples.map((e, j) => (
                    <li key={j}>
                      <Link href={e.href} className="flex min-h-12 items-start gap-3 py-2 text-sm">
                        <span className="mt-0.5 shrink-0 rounded-sm bg-ink px-2 py-0.5 text-[10px] font-bold tracking-widest text-tan uppercase">
                          {e.kind === "recording" ? `Field ${e.t != null ? mmss(e.t) : ""}` : "Practice"}
                        </span>
                        <span>
                          <span className="font-semibold">{e.rep}:</span> {e.text}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="bg-bone p-5 text-ink">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[11px] font-bold tracking-[0.32em] uppercase">Team meeting</p>
                  <span className="font-serif text-base font-bold">XII</span>
                </div>
                <p className="mt-1 font-cond text-[34px] leading-[0.95]">{t.topic}</p>
                <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-[15px]">
                  {t.drill.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
                <p className="mt-3 border-t border-ink/20 pt-3 font-display text-lg leading-snug font-black uppercase">&ldquo;{t.line}&rdquo;</p>
                {t.personaSlug && (
                  <Link href={`/practice/${t.personaSlug}`} className="mt-3 inline-flex min-h-11 items-center rounded-sm bg-ink px-4 text-sm font-bold text-bone">
                    Practice homeowner for this →
                  </Link>
                )}
              </div>
            </article>
          ))}
          <p className="text-xs text-muted">
            From {d.sessions} scored role plays and coached recordings across {d.reps} reps. Percent = reps averaging under 3/5 on that skill. Updated{" "}
            {new Date(d.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })}.
          </p>
        </div>
      )}
    </div>
  );
}
