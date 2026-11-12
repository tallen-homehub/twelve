import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { scoreSession, TIME_CAP_S, type Turn } from "@/lib/roleplay";

export const maxDuration = 60;

/** Ends a session (voice sends its transcript here) and scores it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const body = (await req.json().catch(() => ({}))) as { turns?: Turn[]; voiceSeconds?: number };

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("roleplay_sessions")
    .select("id, profile_id, mode, status, turns, persona:personas(setting)")
    .eq("id", id)
    .single();
  if (!s || s.profile_id !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.status === "scored") return NextResponse.json({ ok: true });

  const update: Record<string, unknown> = { status: "ended" };
  if (s.status === "live") update.ended_at = new Date().toISOString();
  // Only a live call sets the transcript; a retry after failed scoring keeps what was saved.
  if (s.mode === "voice" && s.status === "live") {
    const cap = TIME_CAP_S[(s.persona as unknown as { setting: "door" | "table" }).setting];
    update.turns = (body.turns ?? [])
      .filter((t) => (t.role === "rep" || t.role === "homeowner") && typeof t.text === "string" && t.text.trim())
      .slice(0, 200)
      .map((t) => ({ role: t.role, text: t.text.slice(0, 2000), t: Math.max(0, Math.round(t.t || 0)) }));
    update.voice_seconds = Math.min(Math.max(0, Math.round(body.voiceSeconds ?? 0)), cap + 30);
  }
  await supabase.from("roleplay_sessions").update(update).eq("id", id);

  try {
    await scoreSession(id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Scoring failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
