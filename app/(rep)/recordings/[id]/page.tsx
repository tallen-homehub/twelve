import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mmss } from "@/lib/format";
import { REP_STATUS } from "@/lib/recording-status";
import { Card } from "@/components/ui";
import { CoachingNoteView, type NoteMoment } from "@/components/CoachingNoteView";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Recording" };

type Note = { overall_score: number; summary: string; moments: NoteMoment[]; practice_next?: { skill: string; persona_slug: string | null } };

const WAITING: Record<string, string> = {
  uploaded: "Got it. Turning the audio into text now.",
  transcribing: "Turning the audio into text. Usually a few minutes.",
  analyzing: "Drafting your coaching notes.",
  needs_consent_review: "We couldn't hear the homeowner agree to the recording, so it's being checked before anyone reviews it.",
  awaiting_review: "Your notes are drafted. Chase reviews them before you see them.",
};

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();
  const { data: r } = await supabase.from("recordings").select("id, setting, label, status, error, duration_s, storage_path, recorded_at, created_at").eq("id", id).maybeSingle();
  if (!r) notFound();

  const header = (
    <>
      <Link href="/recordings" className="py-2 text-sm text-muted">
        ← Recordings
      </Link>
      <header className="flex flex-col gap-1 pb-4">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">
          {r.setting === "door" ? "At the door" : "At the table"}
          {r.duration_s ? ` · ${mmss(r.duration_s)}` : ""}
        </p>
        <h1 className="font-display text-3xl font-black lowercase">{r.label || "recording"}</h1>
      </header>
    </>
  );

  if (r.status !== "released") {
    const processing = ["uploaded", "transcribing", "analyzing"].includes(r.status);
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">{REP_STATUS[r.status] ?? r.status}</p>
          <p className="mt-2">{r.status === "failed" ? "This one didn't process. Chase's team can see why and re-run it." : WAITING[r.status]}</p>
        </Card>
        {processing && <AutoRefresh seconds={15} />}
      </div>
    );
  }

  const [{ data: note }, { data: skills }, { data: signed }] = await Promise.all([
    supabase.from("coaching_notes").select("final_output, ai_output, overall_score").eq("recording_id", id).eq("status", "released").maybeSingle(),
    supabase.from("skills").select("slug, name"),
    supabase.storage.from("recordings").createSignedUrl(r.storage_path, 3600),
  ]);
  if (!note) notFound();
  const n = (note.final_output ?? note.ai_output) as Note;
  const persona = n.practice_next?.persona_slug;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {header}
      <div className={`rounded-2xl p-6 text-center ${note.overall_score >= 70 ? "bg-tan text-ink" : "bg-charcoal"}`}>
        <p className="font-display text-7xl font-black">{note.overall_score}</p>
      </div>
      <CoachingNoteView
        audioUrl={signed?.signedUrl ?? null}
        summary={n.summary}
        moments={n.moments}
        skillNames={Object.fromEntries((skills ?? []).map((s) => [s.slug, s.name]))}
        practiceHref={persona ? `/practice/${persona}` : "/practice"}
      />
    </div>
  );
}
