import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { homeownerReply, PERSONA_FIELDS, TIME_CAP_S, type Persona, type Turn } from "@/lib/roleplay";

export const maxDuration = 30;

/** Text role play: adds the rep's line, returns the homeowner's reply. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { text } = (await req.json()) as { text?: string };
  const line = (text ?? "").trim().slice(0, 1000);
  if (!line) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("roleplay_sessions")
    .select(`id, profile_id, mode, status, started_at, turns, state, persona:personas(${PERSONA_FIELDS})`)
    .eq("id", id)
    .single();
  if (!s || s.profile_id !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.status !== "live" || s.mode !== "text") return NextResponse.json({ error: "This session has ended." }, { status: 409 });

  const persona = s.persona as unknown as Persona;
  const elapsed = Math.round((Date.now() - Date.parse(s.started_at)) / 1000);
  const turns: Turn[] = [...((s.turns ?? []) as Turn[]), { role: "rep", text: line, t: elapsed }];

  let reply;
  try {
    reply = await homeownerReply(persona, turns);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 502 });
  }
  turns.push({ role: "homeowner", text: reply.text, t: Math.round((Date.now() - Date.parse(s.started_at)) / 1000) });

  const overTime = elapsed > TIME_CAP_S[persona.setting];
  const ended = reply.ended || overTime;
  await supabase
    .from("roleplay_sessions")
    .update({ turns, state: { ...(s.state as object), trust: reply.trust, outcome: reply.outcome } })
    .eq("id", id);

  return NextResponse.json({ reply: reply.text, ended, overTime });
}
