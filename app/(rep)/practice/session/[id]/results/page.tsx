import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Turn } from "@/lib/roleplay";
import { Card } from "@/components/ui";

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
    .select("id, profile_id, outcome, turns, task_id, persona:personas(id, name, slug), score:roleplay_scores(*)")
    .eq("id", id)
    .single();
  if (!s) notFound();
  const score = s.score as unknown as Score | null;
  const persona = s.persona as unknown as { name: string; slug: string };
  const turns = (s.turns ?? []) as Turn[];
  const { data: skills } = await supabase.from("skills").select("slug, name");
  const skillName = (slug: string) => skills?.find((k) => k.slug === slug)?.name ?? slug;
  const own = s.profile_id === profile.id;

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

  return (
    <div className="flex flex-col gap-5 pb-6">
      <Link href="/practice" className="py-2 text-sm text-muted">
        ← Practice
      </Link>

      <div className={`rounded-2xl p-6 text-center ${score.overall >= 70 ? "bg-tan text-ink" : "bg-charcoal"}`}>
        <p className="text-xs font-bold tracking-widest uppercase opacity-70">{persona.name}</p>
        <p className="font-display text-7xl font-black">{score.overall}</p>
        <p className="font-semibold">{OUTCOME[s.outcome ?? "lost"] ?? s.outcome}</p>
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
          <p className="text-xs font-bold tracking-widest text-tan uppercase">The one thing to fix</p>
          <p className="mt-2 text-lg font-semibold">{score.top_fix.text}</p>
          {turns[score.top_fix.turn - 1] && <p className="mt-2 text-sm text-muted">You said: &ldquo;{turns[score.top_fix.turn - 1].text}&rdquo;</p>}
        </Card>
      )}

      {score.chase_line && (
        <Card className="bg-charcoal-2">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">What Chase would say</p>
          <p className="mt-2 text-lg italic">&ldquo;{score.chase_line}&rdquo;</p>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-xs font-bold tracking-widest text-tan uppercase">By skill</p>
        <ul className="flex flex-col gap-3">
          {Object.entries(score.per_skill).map(([slug, v]) => (
            <li key={slug}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{skillName(slug)}</span>
                <span aria-label={`${v.score} of 5`} className="text-tan">
                  {"●".repeat(v.score)}
                  <span className="text-charcoal-2">{"●".repeat(5 - v.score)}</span>
                </span>
              </div>
              <p className="text-sm text-muted">{v.reason}</p>
            </li>
          ))}
        </ul>
      </Card>

      {score.highlights && score.highlights.length > 0 && (
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">What you did well</p>
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
          <Link href={`/practice/${persona.slug}${s.task_id ? `?task=${s.task_id}` : ""}`} className="flex min-h-12 items-center justify-center rounded-xl bg-tan px-5 py-4 text-lg font-bold text-ink">
            Run it again
          </Link>
          <Link href="/today" className="flex min-h-12 items-center justify-center rounded-xl bg-charcoal px-5 py-4 font-bold">
            Back to today
          </Link>
        </div>
      )}
    </div>
  );
}
