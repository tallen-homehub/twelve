import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Turn } from "@/lib/roleplay";
import { TextRoleplay } from "./TextRoleplay";
import { VoiceRoleplay } from "./VoiceRoleplay";
import { RescoreButton } from "./RescoreButton";

export const metadata = { title: "Role play" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("roleplay_sessions")
    .select("id, profile_id, mode, status, turns, persona:personas(name, slug, setting)")
    .eq("id", id)
    .single();
  if (!s || s.profile_id !== profile.id) notFound();
  if (s.status === "scored") redirect(`/practice/session/${id}/results`);

  const persona = s.persona as unknown as { name: string; slug: string; setting: "door" | "table" };
  if (s.mode === "voice" && s.status !== "live") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">Role play · voice</p>
        <h1 className="font-display text-3xl font-black uppercase">{persona.name}</h1>
        <p className="text-muted">Your call is saved. It just hasn&apos;t been scored yet.</p>
        <RescoreButton sessionId={s.id} />
      </div>
    );
  }
  return s.mode === "voice" ? (
    <VoiceRoleplay sessionId={s.id} personaName={persona.name} setting={persona.setting} />
  ) : (
    <TextRoleplay sessionId={s.id} personaName={persona.name} initialTurns={(s.turns ?? []) as Turn[]} ended={s.status !== "live"} />
  );
}
