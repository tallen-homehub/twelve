import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mmss } from "@/lib/format";
import { STAFF_STATUS } from "@/lib/recording-status";
import { speakerLabel, type SpeakerMap, type Utterance } from "@/lib/recordings";
import { Card } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CoachingNoteView, type NoteMoment } from "@/components/CoachingNoteView";
import { ReviewEditor } from "./ReviewEditor";
import { RecordingActions } from "./RecordingActions";

// Server actions on this page start AI work after responding; give it room to finish.
export const maxDuration = 300;
export const metadata = { title: "Review" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("recordings")
    .select("id, setting, label, status, error, duration_s, storage_path, consent_at_seconds, created_at, profile:profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const [{ data: tr }, { data: note }, { data: skills }, { data: signed }] = await Promise.all([
    supabase.from("transcripts").select("utterances, speaker_map, consent").eq("recording_id", id).maybeSingle(),
    supabase.from("coaching_notes").select("id, status, ai_output, final_output, overall_score").eq("recording_id", id).in("status", ["draft", "released"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("skills").select("slug, name, stage").in("stage", [r.setting, "mindset", "compliance"]).order("position"),
    supabase.storage.from("recordings").createSignedUrl(r.storage_path, 3600),
  ]);
  const map = (tr?.speaker_map ?? null) as SpeakerMap | null;
  const transcript = ((tr?.utterances ?? []) as Utterance[]).map((u) => ({ start: u.start, who: speakerLabel(u.speaker, map), text: u.text }));
  const rep = (r.profile as unknown as { full_name: string } | null)?.full_name ?? "Rep";

  const header = (
    <>
      <Link href="/queue" className="py-2 text-sm text-muted">
        ← Queue
      </Link>
      <header className="flex flex-col gap-1 pb-4">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">
          {r.setting} {r.duration_s ? `· ${mmss(r.duration_s)}` : ""} · {STAFF_STATUS[r.status]}
        </p>
        <h1 className="font-display text-3xl font-black lowercase">{rep}</h1>
        {r.label && <p className="text-muted">{r.label}</p>}
      </header>
    </>
  );

  if (r.status === "awaiting_review" && note?.status === "draft") {
    return (
      <>
        {header}
        <ReviewEditor noteId={note.id} draft={note.ai_output} audioUrl={signed?.signedUrl ?? null} transcript={transcript} skills={(skills ?? []).map((s) => ({ slug: s.slug, name: s.name }))} />
      </>
    );
  }

  if (r.status === "released" && note) {
    const n = (note.final_output ?? note.ai_output) as { summary: string; moments: NoteMoment[]; practice_next?: { persona_slug: string | null } };
    return (
      <div className="flex flex-col gap-4 pb-6">
        {header}
        <p className="text-sm text-muted">Released. Score {note.overall_score}. This is what the rep sees.</p>
        <CoachingNoteView audioUrl={signed?.signedUrl ?? null} summary={n.summary} moments={n.moments} skillNames={Object.fromEntries((skills ?? []).map((s) => [s.slug, s.name]))} practiceHref={null} />
      </div>
    );
  }

  if (r.status === "needs_consent_review" || r.status === "failed") {
    const opening = transcript.filter((l) => l.start <= 300);
    return (
      <div className="flex flex-col gap-4 pb-6">
        {header}
        <Card className="ring-1 ring-red">
          <p className="text-xs font-bold tracking-widest text-red uppercase">{r.status === "failed" ? "Didn't process" : "No consent found"}</p>
          <p className="mt-2">
            {r.status === "failed"
              ? r.error
              : `The AI didn't hear the homeowner agree to be recorded in the first 5 minutes.${r.consent_at_seconds != null ? ` The rep says it's at ${mmss(r.consent_at_seconds)}.` : ""} Listen before you approve it. Nothing has been analyzed.`}
          </p>
        </Card>
        {signed?.signedUrl && <audio src={signed.signedUrl} controls preload="metadata" className="w-full" />}
        {opening.length > 0 && (
          <details className="rounded-2xl bg-charcoal p-4" open={r.status === "needs_consent_review"}>
            <summary className="cursor-pointer font-semibold">First 5 minutes</summary>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {opening.map((l, i) => (
                <li key={i}>
                  <span className="font-bold text-tan">
                    {mmss(l.start)} {l.who}:
                  </span>{" "}
                  {l.text}
                </li>
              ))}
            </ol>
          </details>
        )}
        <RecordingActions recordingId={r.id} kind={r.status === "failed" ? "failed" : "consent"} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <Card>
        <p>{r.status === "analyzing" ? "The AI is drafting notes." : "Transcribing the audio."} This page updates on its own.</p>
      </Card>
      <AutoRefresh seconds={15} />
    </div>
  );
}
