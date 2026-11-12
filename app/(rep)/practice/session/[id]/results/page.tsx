import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Turn } from "@/lib/roleplay";
import Image from "next/image";
import { ButtonLink, Card } from "@/components/ui";
import { PHOTOS, Ring } from "@/components/editorial";

export const metadata = { title: "Your score" };

type Score = {
  overall: number;
  per_skill: Record<string, { score: number; reason: string }>;
  top_fix: { turn: number; text: string } | null;
  chase_line: string | null;
  highlights: { turn: number; text: string }[] | null;
  compliance_flags: string[] | null;
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("roleplay_sessions")
    .select("id, profile_id, persona_id, mode, started_at, ended_at, outcome, turns, task_id, persona:personas(id, name, slug), score:roleplay_scores(*)")
    .eq("id", id)
    .single();
  if (!s) notFound();
  const score = s.score as unknown as Score | null;
  const persona = s.persona as unknown as { name: string; slug: string };
  const turns = (s.turns ?? []) as Turn[];
  const { data: skills } = await supabase.from("skills").select("slug, name");
  const skillName = (slug: string) => skills?.find((k) => k.slug === slug)?.name ?? slug;
  const own = s.profile_id === profile.id;
  // Last scored run on the same homeowner, for "▲ from last run"
  const { data: prev } = await supabase
    .from("roleplay_sessions")
    .select("score:roleplay_scores(overall)")
    .eq("profile_id", s.profile_id)
    .eq("persona_id", s.persona_id)
    .eq("status", "scored")
    .lt("started_at", s.started_at)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevScore = ((Array.isArray(prev?.score) ? prev?.score[0] : prev?.score) as { overall: number } | null | undefined)?.overall ?? null;
  const secs = s.ended_at ? Math.max(0, Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 1000)) : null;

  if (!score) {
    return (
      <Card>
        <p>No score for this run yet.</p>
        <Link href="/practice" className="mt-3 inline-block underline">
          Back to practice
        </Link>
      </Card>
    );
  }

  const OUTCOME: Record<string, string> = { set: "Appointment set", closed: "Closed", lost: "Lost the door", abandoned: "Ended early" };

  const delta = prevScore != null ? score.overall - prevScore : null;
  return (
    <div className="flex flex-col gap-3 pb-6">
      <div className="relative -mx-5 -mt-6 overflow-hidden px-5 pt-6 pb-2">
        <Image src={PHOTOS.crew} alt="" fill priority sizes="100vw" className="object-cover opacity-55" style={{ objectPosition: "50% 30%" }} />
        <div className="grid-lines" aria-hidden="true" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/40 to-ink" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <Link href="/practice" className="flex min-h-12 items-center text-sm text-muted">
              ← Practice
            </Link>
            <span className="label">
              {s.mode}
              {secs != null ? ` · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : ""}
            </span>
          </div>
          <div className="flex flex-col items-center pt-2 text-center">
            <p className="eyebrow">{persona.name}</p>
            <div className="mt-2">
              <Ring value={score.overall / 100} size={240} stroke={8} tone={score.overall >= 70 ? "good" : score.overall >= 50 ? "warn" : "red"}>
                <span className="font-cond text-[104px] leading-[0.9]">{score.overall}</span>
                {delta != null && delta !== 0 && (
                  <span className={`text-xs font-bold ${delta > 0 ? "text-good" : "text-red"}`}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} from last run
                  </span>
                )}
              </Ring>
            </div>
            <p className="mt-3 font-cond text-[44px] leading-none">{OUTCOME[s.outcome ?? "lost"] ?? s.outcome}</p>
          </div>
        </div>
      </div>

      {score.compliance_flags && score.compliance_flags.length > 0 && (
        <Card className="ring-2 ring-red">
          <p className="text-xs font-bold tracking-widest text-red uppercase">Red flag: honesty</p>
          <ul className="mt-2 ml-5 list-disc text-sm">
            {score.compliance_flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </Card>
      )}

      {score.top_fix && (
        <Card>
          <p className="eyebrow">The one thing to fix</p>
          <p className="mt-2 text-lg font-semibold">{score.top_fix.text}</p>
          {turns[score.top_fix.turn - 1] && <p className="mt-2 text-sm text-muted">You said: &ldquo;{turns[score.top_fix.turn - 1].text}&rdquo;</p>}
        </Card>
      )}

      {score.chase_line && (
        <div className="rounded-sm bg-bone p-5 text-ink">
          <p className="text-[11px] font-bold tracking-[0.32em] uppercase">Say it like Chase</p>
          <p className="mt-2 font-display text-[25px] leading-[1.1] font-black uppercase">&ldquo;{score.chase_line}&rdquo;</p>
        </div>
      )}

      <Card>
        <p className="eyebrow mb-3">By skill</p>
        <ul className="flex flex-col gap-3">
          {Object.entries(score.per_skill).map(([slug, v]) => (
            <li key={slug}>
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{skillName(slug)}</span>
                <span>{v.score}/5</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-charcoal-2" role="img" aria-label={`${v.score} of 5`}>
                <div className={`h-full rounded-full ${v.score >= 4 ? "bg-good" : v.score === 3 ? "bg-warn" : "bg-red"}`} style={{ width: `${v.score * 20}%` }} />
              </div>
              <p className="mt-1 text-sm text-muted">{v.reason}</p>
            </li>
          ))}
        </ul>
      </Card>

      {score.highlights && score.highlights.length > 0 && (
        <Card>
          <p className="eyebrow !text-good">What you did well</p>
          <ul className="mt-2 ml-5 list-disc">
            {score.highlights.map((h, i) => (
              <li key={i}>{h.text}</li>
            ))}
          </ul>
        </Card>
      )}

      <details className="rounded-2xl bg-charcoal p-4">
        <summary className="cursor-pointer font-semibold">Transcript</summary>
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {turns.map((t, i) => (
            <li key={i}>
              <span className="font-bold text-tan">
                {i + 1}. {t.role === "rep" ? "You" : "Homeowner"}:
              </span>{" "}
              {t.text}
            </li>
          ))}
        </ol>
      </details>

      {own && (
        <div className="flex flex-col gap-3">
          <ButtonLink href={`/practice/${persona.slug}${s.task_id ? `?task=${s.task_id}` : ""}`}>Run it back</ButtonLink>
          <ButtonLink href="/today" variant="ghost">
            Back to today
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
